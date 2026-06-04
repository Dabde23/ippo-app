import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

const DAILY_REMINDER_ID = 'daily-reminder';

// web 用のタイマー管理（モジュールスコープ）
let webReminderTimer: ReturnType<typeof setTimeout> | null = null;

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(time: string, message: string): Promise<void> {
  if (Platform.OS === 'web') {
    cancelDailyReminder(); // 既存タイマーをクリア
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const scheduleNext = () => {
      const [hour, minute] = time.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hour, minute, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const delay = target.getTime() - now.getTime();
      webReminderTimer = setTimeout(() => {
        new Notification('ippo からのお知らせ', { body: message });
        scheduleNext(); // 翌日の同時刻に再スケジュール
      }, delay);
    };

    scheduleNext();
    return;
  }

  const [hour, minute] = time.split(':').map(Number);

  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'ippo からのお知らせ',
      body: message,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') {
    if (webReminderTimer !== null) {
      clearTimeout(webReminderTimer);
      webReminderTimer = null;
    }
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}
