import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts, BIZUDPGothic_400Regular, BIZUDPGothic_700Bold } from '@expo-google-fonts/biz-udpgothic';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Analytics } from '@vercel/analytics/react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';
import { scheduleReminders, scheduleTaskReminder, registerNotificationCategories } from './src/services/NotificationService';

export default function App() {
  const [loaded] = useFonts({ BIZUDPGothic_400Regular, BIZUDPGothic_700Bold });

  // 起動時にリマインダー通知のアクションボタン（今すぐ開始 / 次に回す）カテゴリを登録。
  // ネイティブのみ。web はカテゴリ非対応のため no-op。
  useEffect(() => {
    if (Platform.OS === 'web') return;
    registerNotificationCategories();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const { reminders, reminderMessage, tasks } = useAppStore.getState();
    scheduleReminders(reminders, reminderMessage);
    for (const task of tasks) {
      if (task.taskReminderTime && !task.completed) {
        scheduleTaskReminder(task.id, task.title, task.taskReminderTime, !!task.routineSourceId);
      }
    }
  }, []);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
      {Platform.OS === 'web' && <Analytics />}
    </SafeAreaProvider>
  );
}
