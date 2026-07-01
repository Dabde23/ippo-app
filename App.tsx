import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts, BIZUDPGothic_400Regular, BIZUDPGothic_700Bold } from '@expo-google-fonts/biz-udpgothic';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Analytics } from '@vercel/analytics/react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';
import {
  scheduleReminders,
  scheduleTaskReminder,
  registerNotificationCategories,
  cancelAllReminders,
  cancelTaskReminder,
} from './src/services/NotificationService';

export default function App() {
  const [loaded] = useFonts({ BIZUDPGothic_400Regular, BIZUDPGothic_700Bold });

  // 起動時にリマインダー通知のアクションボタン（今すぐ開始 / 次に回す）カテゴリを登録。
  // ネイティブのみ。web はカテゴリ非対応のため no-op。
  useEffect(() => {
    if (Platform.OS === 'web') return;
    registerNotificationCategories();
  }, []);

  // リマインダー機能は Pro解放限定。未解放ユーザーには通知を一切スケジュールしない
  // （旧データが残っていても実スケジュールは行わない）。
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const { reminders, reminderMessage, tasks, isProUnlocked, hasPendingPurchase } =
      useAppStore.getState();

    if (!isProUnlocked) {
      // issue #5: 未解放ユーザーの端末に、過去（Pro解放中 or ゲート実装前）にスケジュール
      // 済みの通知が OS 側へ残っていると届き続けてしまう。起動時に確実に消す。
      // NotificationService の既存キャンセル関数のみを使う（新規キャンセル関数は作らない）。
      // cancel系を Promise.all でまとめてから restorePro() を呼ぶことで、両者が並走せず
      // 実行順序を明示する（可読性のための直列化。実害は元々なかった）。
      void (async () => {
        await Promise.all([
          cancelAllReminders(),
          ...tasks
            .filter((task) => task.taskReminderTime)
            .map((task) => cancelTaskReminder(task.id)),
        ]);

        // 前回pendingを経験したユーザーのみ、起動時にストア通信（restorePro）を行う。
        // 未購入ユーザー（hasPendingPurchaseがfalse）は無条件のストア通信をスキップする。
        // issue #1: 前回 pending だった購入が確定していれば、この起動タイミングで解放する。
        // store の restorePro アクションは 'success' のとき isProUnlocked=true にしたうえで
        // 通知スケジュールまで行う。確定済み購入が無ければ 'failed'/'pending' で何も起きない。
        if (hasPendingPurchase) {
          await useAppStore.getState().restorePro();
        }
      })();
      return;
    }

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
