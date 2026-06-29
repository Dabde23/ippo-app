// 日付の JST(Asia/Tokyo, UTC+9, 00:00境界) 統一ユーティリティ（QA #001）
//
// アプリ内で「その日」を判定する処理はすべてここを経由し、デバイスのタイムゾーンや
// UTC ではなく **ハードに日本時間（JST）** で日付を決める。
//
// JST は夏時間(DST)を持たない固定オフセット(UTC+9)なので、UTC エポックに +9h して
// UTC フィールドを読むだけで JST の壁時計の日付・時刻が得られる。Intl/toLocaleString に
// 依存しない純粋な算術のため、Hermes / 各端末で挙動が安定する。
//
// 将来グローバル展開で「ユーザー設定タイムゾーン」へ切り替える場合も、この1ファイルの
// オフセット計算を差し替えるだけで済む（呼び出し側は変更不要）。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 入力時刻を JST に寄せた Date（UTCフィールドが JST 壁時計を表す）にする内部ヘルパー
function toJstShifted(input: string | number | Date): Date {
  return new Date(new Date(input).getTime() + JST_OFFSET_MS);
}

// 任意の時刻(ISO文字列 / epoch ms / Date)を JST の YYYY-MM-DD に変換する。
export function dateOfJST(input: string | number | Date): string {
  const d = toJstShifted(input);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 現在時刻の JST 日付 YYYY-MM-DD。
export function today(): string {
  return dateOfJST(Date.now());
}

// 任意の時刻を JST の HH:MM に変換する（記録の時刻表示用）。
export function timeOfJST(input: string | number | Date): string {
  const d = toJstShifted(input);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}
