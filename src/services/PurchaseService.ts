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

// 購入結果の3状態。
//  - 'success': 購入が確定し、Pro解放してよい
//  - 'pending': 保留中（iOS Ask to Buy / 家族共有の承認待ち、Android の PENDING 決済等）。
//               成功でも失敗でもない。解放はせず、確定後に反映する導線に載せる。
//  - 'failed' : キャンセル・エラー等で購入が成立しなかった
// expo-iap 4.3.5 の型: Purchase.purchaseState は 'pending' | 'purchased' | 'unknown'。
// 'pending' を第3の状態として扱い、即失敗にして握りつぶさないことがこの型の目的。
export type PurchaseResult = 'success' | 'pending' | 'failed';

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
export async function purchasePro(): Promise<PurchaseResult> {
  if (!IAP_SUPPORTED) return 'failed';
  await initPurchaseConnection();

  const requestStartedAt = Date.now();

  return new Promise<PurchaseResult>((resolve) => {
    let settled = false;
    let updatedSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
    let errorSub: ReturnType<typeof purchaseErrorListener> | null = null;

    // 二重解決とリスナー解除漏れを防ぐ単一の終了口。
    // 全てのコードパス（正常・pending・エラー・requestPurchase 例外）から必ずここを通す。
    // cleanup を settle 内で確実に呼ぶことで、リスナーが解除されず残るリークを防ぐ。
    function settle(result: PurchaseResult) {
      if (settled) return;
      settled = true;
      updatedSub?.remove();
      errorSub?.remove();
      updatedSub = null;
      errorSub = null;
      resolve(result);
    }

    requestPurchase({
      request: {
        apple: { sku: PRO_UNLOCK_SKU },
        google: { skus: [PRO_UNLOCK_SKU] },
      },
      type: 'in-app',
    }).catch(() => {
      // requestPurchase 自体が reject した場合（起動失敗等）は失敗扱い。
      settle('failed');
    });

    // リスナーは requestPurchase 呼び出し後に登録することで、呼び出し前から
    // 存在していた未消化イベント（起動時replay等）を拾わないようにする。
    updatedSub = purchaseUpdatedListener(async (purchase: Purchase) => {
      if (settled) return;
      if (purchase.productId !== PRO_UNLOCK_SKU) return;
      // 今回のリクエスト開始より前に発生したトランザクションは無関係のため無視する。
      if (purchase.transactionDate < requestStartedAt) return;

      // ── pending（保留）状態の検知 ──
      // iOS: Ask to Buy（家族共有の承認待ち）、Android: PENDING 決済（銀行振込等）。
      // この状態では購入は確定しておらず finishTransaction / acknowledge してはならない。
      // 成功でも失敗でもない 'pending' を返し、確定後に getAvailablePurchases /
      // purchaseUpdatedListener の再通知で解放する導線（restorePro / 起動時同期）へ委ねる。
      if (purchase.purchaseState === 'pending') {
        settle('pending');
        return;
      }

      // 'purchased'（および 'unknown'。unknown は StoreKit で確定扱いされ得るため成功に倒す）。
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
        settle('success');
      }
    });

    errorSub = purchaseErrorListener((_error) => {
      settle('failed');
    });
  });
}

// 購入済み履歴からPro解放の有無を復元する（「購入を復元」ボタン用）。
// また、購入直後に pending だったトランザクションが後から確定したかを再同期する用途も兼ねる。
//   - 'success': 確定済みの購入がある → Pro解放してよい
//   - 'pending': まだ保留中のトランザクションのみ存在する → 解放しない（処理中表示のまま）
//   - 'failed' : 該当する購入が無い / 取得失敗
export async function restorePro(): Promise<PurchaseResult> {
  if (!IAP_SUPPORTED) return 'failed';
  await initPurchaseConnection();
  try {
    const purchases = await getAvailablePurchases();
    const matched = purchases.filter((p) => p.productId === PRO_UNLOCK_SKU);
    if (matched.length === 0) return 'failed';

    // 確定済み（pending 以外）のトランザクションを優先する。
    const confirmed = matched.find((p) => p.purchaseState !== 'pending');
    if (confirmed) {
      try {
        await finishTransaction({ purchase: confirmed, isConsumable: false });
      } catch {
        // 完了処理に失敗しても購入自体は有効なので解放扱いにする（上と同様の理由）。
      }
      return 'success';
    }

    // 該当商品はあるが全て pending → まだ確定していない。解放せず処理中扱い。
    // pending は finishTransaction / acknowledge してはならないため、ここでは何もしない。
    return 'pending';
  } catch {
    return 'failed';
  }
}
