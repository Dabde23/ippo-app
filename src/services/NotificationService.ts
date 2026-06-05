import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Reminder } from '../store/useAppStore';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const NOTIF_TITLE = 'ippo からのお知らせ';

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

  // ネイティブ: 既存の reminder-* 通知をすべてキャンセルしてから再登録
  await cancelAllReminders();

  for (const reminder of reminders) {
    const [hour, minute] = reminder.time.split(':').map(Number);
    for (const day of reminder.days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `reminder-${reminder.id}-day-${day}`,
        content: { title: NOTIF_TITLE, body: reminder.name.trim() || message },
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

  // ネイティブ: DAILY trigger
  await Notifications.cancelScheduledNotificationAsync(key).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: key,
    content: { title: NOTIF_TITLE, body: title },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  }).catch(() => {});
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  const key = `task-reminder-${taskId}`;
  if (Platform.OS === 'web') {
    clearWebTimer(key);
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(key).catch(() => {});
}
