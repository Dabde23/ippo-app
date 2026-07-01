import { Platform } from 'react-native';
import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
} from 'expo-iap';

// ── Pro解放 商品ID ──
// ストア審査後、App Store Connect / Google Play Console で登録した実IDに差し替える。
// 差し替えはここ1箇所のみでよい。
export const PRO_UNLOCK_SKU = 'pro_unlock';

// expo-iap は Web 未対応（ネイティブのストア課金APIに依存するため）。
// NotificationService と同様、Platform.OS === 'web' はガードして no-op にする。
const IAP_SUPPORTED = Platform.OS !== 'web';

let connectionInitialized = false;

// アプリ起動時（Pro関連画面表示前）に一度呼ぶ。ストア接続を初期化する。
// 冪等: 複数回呼んでも一度しか initConnection しない。
export async function initPurchaseConnection(): Promise<void> {
  if (!IAP_SUPPORTED) return;
  if (connectionInitialized) return;
  connectionInitialized = true;
  try {
    await initConnection();
  } catch {
    // 接続失敗時は次回呼び出しで再試行できるようにフラグを戻す
    connectionInitialized = false;
  }
}

// Pro解放商品の情報を取得する（価格表示等に利用）。
export async function fetchProUnlockProduct(): Promise<Product | null> {
  if (!IAP_SUPPORTED) return null;
  try {
    await initPurchaseConnection();
    const result = await fetchProducts({ skus: [PRO_UNLOCK_SKU], type: 'in-app' });
    const products = Array.isArray(result) ? result : [];
    return (products.find((p) => p.id === PRO_UNLOCK_SKU) as Product | undefined) ?? null;
  } catch {
    return null;
  }
}

// Pro解放（非消耗型IAP）を購入する。
// requestPurchase はイベントベースAPIのため、purchaseUpdatedListener /
// purchaseErrorListener の結果を Promise でラップして呼び出し側は await で完結させる。
//
// [レビュー対応] purchaseUpdatedListener はモジュール全体の購入イベントを拾うため、
// 起動時replay等の「今回押した購入ボタンとは無関係な過去の未消化イベント」を誤って
// 拾わないよう、以下の2点で「今回のrequestPurchase呼び出しに対応するイベントか」を識別する。
//   1. リスナーは requestPurchase 呼び出し後に登録する
//      （呼び出し前から存在する未消化イベントの再生を拾わない）
//   2. purchase.transactionDate が呼び出し開始時刻以降であることを確認する
//      （expo-iap 4.x にはrequestPurchaseとイベントを紐付けるcorrelation IDが無いため、
//       productId一致 + 発生時刻での照合が現状取りうる最善の識別手段）
export async function purchasePro(): Promise<boolean> {
  if (!IAP_SUPPORTED) return false;
  await initPurchaseConnection();

  const requestStartedAt = Date.now();

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let updatedSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
    let errorSub: ReturnType<typeof purchaseErrorListener> | null = null;

    function cleanup() {
      updatedSub?.remove();
      errorSub?.remove();
    }

    requestPurchase({
      request: {
        apple: { sku: PRO_UNLOCK_SKU },
        google: { skus: [PRO_UNLOCK_SKU] },
      },
      type: 'in-app',
    }).catch(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    });

    // リスナーは requestPurchase 呼び出し後に登録することで、呼び出し前から
    // 存在していた未消化イベント（起動時replay等）を拾わないようにする。
    updatedSub = purchaseUpdatedListener(async (purchase: Purchase) => {
      if (settled) return;
      if (purchase.productId !== PRO_UNLOCK_SKU) return;
      // 今回のリクエスト開始より前に発生したトランザクションは無関係のため無視する。
      if (purchase.transactionDate < requestStartedAt) return;
      settled = true;
      try {
        // 非消耗型（買い切り）のため isConsumable: false でトランザクションを完了させる。
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        // finishTransaction 失敗時もストア上は購入済みのため解放は成功扱いにする。
        // 未完了トランザクションは次回起動時に replay される（iOS）/ getAvailablePurchases
        // で拾える（Android）ため、データ不整合にはならない。
        // 上記の識別ロジックにより「今回の購入」であることは確定済みのため、
        // finishTransaction失敗時に解放を見送るリスクよりも、確実に解放する方を優先する。
      } finally {
        cleanup();
        resolve(true);
      }
    });

    errorSub = purchaseErrorListener((_error) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    });
  });
}

// 購入済み履歴からPro解放の有無を復元する（「購入を復元」ボタン用）。
export async function restorePro(): Promise<boolean> {
  if (!IAP_SUPPORTED) return false;
  await initPurchaseConnection();
  try {
    const purchases = await getAvailablePurchases();
    const owned = purchases.find((p) => p.productId === PRO_UNLOCK_SKU);
    if (!owned) return false;
    try {
      await finishTransaction({ purchase: owned, isConsumable: false });
    } catch {
      // 完了処理に失敗しても購入自体は有効なので解放扱いにする（上と同様の理由）。
    }
    return true;
  } catch {
    return false;
  }
}
