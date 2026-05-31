import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
} from 'react-native';
import { XPBar } from '../components/XPBar';
import { useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../services/NotificationService';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

const TIME_OPTIONS = ['07:00','08:00','09:00','10:00','12:00','18:00','20:00','21:00','22:00'];

export function ProfileScreen() {
  const { xp, badges, tasks, reminderEnabled, reminderTime, setReminder } = useAppStore();
  const completedTotal = tasks.filter((t) => t.completed).length;
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  async function handleReminderToggle() {
    if (reminderEnabled) {
      await cancelDailyReminder();
      setReminder(false, reminderTime);
    } else {
      const granted = await requestNotificationPermission();
      if (!granted && Platform.OS !== 'web') return;
      await scheduleDailyReminder(reminderTime);
      setReminder(true, reminderTime);
    }
  }

  async function handleTimeSelect(time: string) {
    setTimePickerVisible(false);
    setReminder(true, time);
    await scheduleDailyReminder(time);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>プロフィール</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{completedTotal}</Text>
            <Text style={styles.statLabel}>完了タスク</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{xp}</Text>
            <Text style={styles.statLabel}>累計XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{badges.length}</Text>
            <Text style={styles.statLabel}>バッジ</Text>
          </View>
        </View>

        {/* XP bar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ 経験値</Text>
          <XPBar xp={xp} />
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 バッジ</Text>
          {badges.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Text style={styles.emptyBadgeIcon}>🎖</Text>
              <Text style={styles.emptyBadgeText}>タスクを完了してXPを貯めよう！</Text>
              <Text style={styles.emptyBadgeHint}>100XP でバッジ獲得</Text>
            </View>
          ) : (
            <View style={styles.badgeGrid}>
              {badges.map((badge) => (
                <View key={badge.id} style={styles.badgeCard}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDate}>{badge.earnedAt}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Reminder settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 リマインダー</Text>
          <View style={styles.reminderCard}>
            <View style={styles.reminderRow}>
              <View>
                <Text style={styles.reminderLabel}>毎日の通知</Text>
                <Text style={styles.reminderSub}>
                  {Platform.OS === 'web'
                    ? 'モバイルアプリで利用できます'
                    : reminderEnabled ? `毎日 ${reminderTime} に通知` : 'オフ'}
                </Text>
              </View>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[styles.togglePill, reminderEnabled && styles.togglePillOn]}
                  onPress={handleReminderToggle}
                  activeOpacity={0.8}
                >
                  <Text style={styles.toggleText}>{reminderEnabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {Platform.OS !== 'web' && reminderEnabled && (
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => setTimePickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.timeBtnText}>⏰ 時刻を変更: {reminderTime}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Early access banner */}
        <View style={styles.earlyAccessBanner}>
          <Text style={styles.earlyAccessTitle}>🎉 アーリーアクセス期間中</Text>
          <Text style={styles.earlyAccessSub}>
            現在、全機能を無料でご利用いただけます。{'\n'}
            ネイティブアプリ公開時に有料プランへ移行予定です。
          </Text>
        </View>
      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.timeOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View style={styles.timeSheet}>
            <Text style={styles.timeSheetTitle}>通知時刻を選択</Text>
            {TIME_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeOption, reminderTime === t && styles.timeOptionActive]}
                onPress={() => handleTimeSelect(t)}
              >
                <Text style={[styles.timeOptionText, reminderTime === t && styles.timeOptionTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow.sm,
  },
  statNum: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  emptyBadges: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadow.sm,
  },
  emptyBadgeIcon: {
    fontSize: 36,
  },
  emptyBadgeText: {
    fontSize: fontSize.md,
    color: colors.textMain,
    fontWeight: fontWeight.medium,
  },
  emptyBadgeHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '30%',
    gap: spacing.xs,
    ...shadow.sm,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeName: {
    fontSize: fontSize.xs,
    color: colors.textMain,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  badgeDate: {
    fontSize: 10,
    color: colors.textSub,
  },
  comingSoon: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.sm,
  },
  comingSoonText: {
    fontSize: fontSize.md,
    color: colors.textSub,
  },
  premiumCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    ...shadow.sm,
  },
  premiumCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  premiumCardPrice: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  premiumFeatures: {
    width: '100%',
    gap: spacing.sm,
  },
  premiumFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumFeatureIcon: {
    fontSize: fontSize.md,
    width: 24,
    textAlign: 'center',
  },
  premiumFeatureLabel: {
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  upgradeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...shadow.sm,
  },
  upgradeBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  reminderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  reminderSub: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    marginTop: spacing.xs,
  },
  timeBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  timeBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  timeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: 240,
    gap: spacing.xs,
  },
  timeSheetTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  timeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: colors.primary + '15',
  },
  timeOptionText: {
    fontSize: fontSize.md,
    color: colors.textSub,
  },
  timeOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  earlyAccessBanner: {
    backgroundColor: colors.primary + '12',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  earlyAccessTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  earlyAccessSub: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  togglePill: {
    backgroundColor: colors.locked,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  togglePillOn: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
});
