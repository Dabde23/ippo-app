import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import type { Reminder } from '../store/useAppStore';

if (Platform.OS !== 'web') {
  // Expo SDK v56: `shouldShowAlert` は deprecated。`shouldShowBanner` /
  // `shouldShowList` を指定する（docs/v56.0.0/sdk/notifications）。
  // この handler が「フォアグラウンド中に通知を表示するか」を決定するため、
  // banner/list を true にしないとアプリ表示中に通知が出ない。
  // priority(MAX) は Android のヘッドアップ表示（前面ポップアップ）に必要。
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}

const NOTIF_TITLE = 'ippo からのお知らせ';

// ── 通知カテゴリ（アクションボタン）──
// 識別子に `:` `-` は使えない制約があるためアンダースコア表記。
export const REMINDER_CATEGORY = 'ippo_reminder';
export const ACTION_START = 'start'; // 今すぐ開始
export const ACTION_LATER = 'later'; // 次に回す
const NOTIF_CHANNEL_ID = 'reminders';

// アプリ起動時に一度だけ呼び、リマインダー通知のアクションボタンを登録する。
// プラットフォーム差: Android はボタン常時表示。iOS は権限付与後＆展開時に出る場合あり。
// web はカテゴリ非対応のため何もしない。
// Android 通知チャンネルを冪等に生成する。
// channelId を指定した通知より「前」にチャンネルが存在しないと、
// 通知が既定チャンネル（importance 低）へ落ちてヘッドアップ表示されない。
// そのため各 schedule 関数の冒頭でも呼び、登録タイミングの取りこぼしを防ぐ。
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NOTIF_CHANNEL_ID, {
    name: 'リマインダー',
    importance: Notifications.AndroidImportance.HIGH,
  }).catch(() => {});
}

let categoryRegistered = false;
export async function registerNotificationCategories(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (categoryRegistered) return;
  categoryRegistered = true;
  // Android: 通知チャンネルを明示生成（ヘッドアップ表示の品質向上）
  await ensureAndroidChannel();
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: ACTION_START,
      buttonTitle: '今すぐ開始',
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_LATER,
      buttonTitle: '次に回す',
      options: { opensAppToForeground: false },
    },
  ]).catch(() => {});
}

// ── H-6: 正確アラーム（SCHEDULE_EXACT_ALARM）誘導 ──
// expo-notifications v56 は canScheduleExactAlarms を公開していないため、
// 可否の自動判定はせず、ユーザー起動型で端末の「アラームとリマインダー」設定を開く。
// Android 13+ では既定で未許可のため、未許可だと不正確アラームにフォールバックし数分遅延する。
export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    // iOS/web は正確アラームの概念が無い（OSが正確に発火）。アプリ設定を開くだけ。
    await Linking.openSettings().catch(() => {});
    return;
  }
  try {
    // アプリ別「アラームとリマインダー」設定を直接開く
    await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  } catch {
    // 端末が当該インテント未対応の場合はアプリ設定へフォールバック
    await Linking.openSettings().catch(() => {});
  }
}

// ── 通知 ID 体系 ──
// 定刻通知:     reminder-{reminderId}-day-{day}
// タスク連動:   task-reminder-{taskId}

// expo-notifications の WEEKLY trigger は weekday: 1=Sunday ... 7=Saturday。
// 本アプリの days は 1=月 ... 7=日。両者を変換する。
function toExpoWeekday(appDay: number): number {
  // 月(1)→2, 火(2)→3, ... 土(6)→7, 日(7)→1
  return appDay === 7 ? 1 : appDay + 1;
}

// ── web 用タイマー管理（モジュールスコープ）──
// 定刻通知: key = `reminder-{reminderId}-day-{day}`
// タスク連動: key = `task-reminder-{taskId}`
const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearWebTimer(key: string) {
  const t = webTimers.get(key);
  if (t !== undefined) {
    clearTimeout(t);
    webTimers.delete(key);
  }
}

function clearWebTimersByPrefix(prefix: string) {
  for (const key of Array.from(webTimers.keys())) {
    if (key.startsWith(prefix)) clearWebTimer(key);
  }
}

function webAvailable(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

// JS getDay(): 0=Sun ... 6=Sat → app day: 1=Mon ... 7=Sun
function jsDayToAppDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ════════════════════════════════════════
// 定刻通知（複数 + 曜日設定）
// ════════════════════════════════════════

export async function scheduleReminders(reminders: Reminder[], message: string): Promise<void> {
  if (Platform.OS === 'web') {
    // 既存の定刻タイマーをすべてクリア
    clearWebTimersByPrefix('reminder-');
    if (!webAvailable()) return;

    for (const reminder of reminders) {
      const [hour, minute] = reminder.time.split(':').map(Number);
      for (const day of reminder.days) {
        const key = `reminder-${reminder.id}-day-${day}`;

        const scheduleNext = () => {
          const now = new Date();
          // 次にこの曜日・時刻が来るまでの遅延を計算
          const target = new Date(now);
          target.setHours(hour, minute, 0, 0);
          // 0=Sun..6=Sat を app day へ
          let dayDiff = (day - jsDayToAppDay(now.getDay()) + 7) % 7;
          if (dayDiff === 0 && target <= now) dayDiff = 7;
          target.setDate(target.getDate() + dayDiff);

          const delay = target.getTime() - now.getTime();
          const body = reminder.name.trim() || message;
          const timer = setTimeout(() => {
            if (webAvailable()) new Notification(NOTIF_TITLE, { body });
            scheduleNext(); // 翌週の同曜日に再スケジュール
          }, delay);
          webTimers.set(key, timer);
        };

        scheduleNext();
      }
    }
    return;
  }

  // ネイティブ: チャンネルを確実に用意してから、既存 reminder-* を再登録
  await ensureAndroidChannel();
  await cancelAllReminders();

  for (const reminder of reminders) {
    const [hour, minute] = reminder.time.split(':').map(Number);
    // ルーティン連動リマインダーは routineTaskId を taskId として埋め、通知から提示置換できるようにする。
    // タスク非紐づけの独立リマインダーは taskId を持たず、本体タップでアプリを開くだけになる。
    const content: Notifications.NotificationContentInput = {
      title: NOTIF_TITLE,
      body: reminder.name.trim() || message,
      categoryIdentifier: REMINDER_CATEGORY,
      ...(reminder.routineTaskId ? { data: { taskId: reminder.routineTaskId } } : {}),
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNEL_ID } : {}),
    };
    for (const day of reminder.days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `reminder-${reminder.id}-day-${day}`,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(day),
          hour,
          minute,
        },
      }).catch(() => {});
    }
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') {
    clearWebTimersByPrefix('reminder-');
    return;
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const notif of scheduled) {
    if (typeof notif.identifier === 'string' && notif.identifier.startsWith('reminder-')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier).catch(() => {});
    }
  }
}

// ════════════════════════════════════════
// タスク連動リマインダー
// ════════════════════════════════════════

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  time: string,
  isRoutine: boolean
): Promise<void> {
  const key = `task-reminder-${taskId}`;
  const [hour, minute] = time.split(':').map(Number);

  if (Platform.OS === 'web') {
    clearWebTimer(key);
    if (!webAvailable()) return;

    const scheduleNext = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(hour, minute, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const delay = target.getTime() - now.getTime();
      const timer = setTimeout(() => {
        if (webAvailable()) new Notification(NOTIF_TITLE, { body: title });
        if (isRoutine) {
          scheduleNext(); // ルーティンは毎日繰り返し
        } else {
          webTimers.delete(key); // 通常タスクは1回のみ
        }
      }, delay);
      webTimers.set(key, timer);
    };

    scheduleNext();
    return;
  }

  // ネイティブ: ルーティンは DAILY、単発タスクは DATE（次の該当時刻に1回）
  // content には taskId と アクションボタン用カテゴリを必ず付与（応答ハンドリングがデータ駆動で動く）。
  await ensureAndroidChannel();
  const content: Notifications.NotificationContentInput = {
    title: NOTIF_TITLE,
    body: title,
    categoryIdentifier: REMINDER_CATEGORY,
    data: { taskId },
    ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNEL_ID } : {}),
  };
  await Notifications.cancelScheduledNotificationAsync(key).catch(() => {});
  if (isRoutine) {
    await Notifications.scheduleNotificationAsync({
      identifier: key,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    }).catch(() => {});
  } else {
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    await Notifications.scheduleNotificationAsync({
      identifier: key,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
      },
    }).catch(() => {});
  }
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  const key = `task-reminder-${taskId}`;
  if (Platform.OS === 'web') {
    clearWebTimer(key);
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(key).catch(() => {});
}

// ════════════════════════════════════════
// タイマー終了通知
// ════════════════════════════════════════

const TIMER_END_KEY = 'timer-end';

// タイマー終了通知をスケジュール（seconds秒後に発火）
export async function scheduleTimerEndNotification(seconds: number, body: string): Promise<void> {
  if (Platform.OS === 'web') {
    clearWebTimer(TIMER_END_KEY);
    if (!webAvailable()) return;
    const timer = setTimeout(() => {
      if (webAvailable()) new Notification(NOTIF_TITLE, { body });
      webTimers.delete(TIMER_END_KEY);
    }, seconds * 1000);
    webTimers.set(TIMER_END_KEY, timer);
    return;
  }
  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(TIMER_END_KEY).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: TIMER_END_KEY,
    // Android: channelId を付けないと既定チャンネル（importance 低）へ落ち、
    // フォアグラウンドでヘッドアップ表示されない。リマインダーと同じ HIGH チャンネルを使う。
    content: {
      title: NOTIF_TITLE,
      body,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  }).catch(() => {});
}

// タイマー終了通知をキャンセル
export async function cancelTimerEndNotification(): Promise<void> {
  if (Platform.OS === 'web') {
    clearWebTimer(TIMER_END_KEY);
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(TIMER_END_KEY).catch(() => {});
}
