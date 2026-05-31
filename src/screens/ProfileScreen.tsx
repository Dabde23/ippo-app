import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  SafeAreaView, Platform, Modal, TextInput,
} from 'react-native';
import { XPBar } from '../components/XPBar';
import { TaskCard } from '../components/TaskCard';
import { useAppStore, Task, today } from '../store/useAppStore';
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const todayStr = today();
  const availableTasks = tasks.filter((t) => !t.completed && t.skippedDate !== todayStr);
  const skippedTasks = tasks.filter((t) => !t.completed && t.skippedDate === todayStr);
  const completedTasks = tasks.filter((t) => t.completed);

  function openEdit(task: Task) { setEditingTask(task); setEditTitle(task.title); }
  function handleEditSave() {
    if (!editingTask || !editTitle.trim()) return;
    useAppStore.getState().editTask(editingTask.id, editTitle.trim());
    setEditingTask(null); setEditTitle('');
  }

  async function handleReminderToggle() {
    if (reminderEnabled) {
      await cancelDailyReminder(); setReminder(false, reminderTime);
    } else {
      const granted = await requestNotificationPermission();
      if (!granted && Platform.OS !== 'web') return;
      await scheduleDailyReminder(reminderTime); setReminder(true, reminderTime);
    }
  }

  async function handleTimeSelect(time: string) {
    setTimePickerVisible(false); setReminder(true, time); await scheduleDailyReminder(time);
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.title}>プロフィール</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{completedTotal}</Text>
            <Text style={styles.statLabel}>完了</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMid]}>
            <Text style={styles.statNum}>{xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{badges.length}</Text>
            <Text style={styles.statLabel}>バッジ</Text>
          </View>
        </View>
        <XPBar xp={xp} variant="header" />
      </View>

      {/* ── CONTENT ── */}
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Task list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>タスク一覧</Text>
            {tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>タスクがありません</Text>
              </View>
            ) : (
              <>
                {availableTasks.length > 0 && (
                  <><Text style={styles.groupLabel}>残り {availableTasks.length} 件</Text>
                    {availableTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
                )}
                {skippedTasks.length > 0 && (
                  <><Text style={styles.groupLabel}>今日あとで  {skippedTasks.length} 件</Text>
                    {skippedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
                )}
                {completedTasks.length > 0 && (
                  <><Text style={styles.groupLabel}>完了  {completedTasks.length} 件</Text>
                    {completedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
                )}
              </>
            )}
          </View>

          {/* Badges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>バッジ</Text>
            {badges.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>🎖</Text>
                <Text style={styles.emptyCardText}>タスクを完了して XP を貯めよう</Text>
                <Text style={styles.emptyCardHint}>100 XP でバッジ獲得</Text>
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

          {/* Reminder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>リマインダー</Text>
            <View style={styles.card}>
              <View style={styles.reminderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderLabel}>毎日の通知</Text>
                  <Text style={styles.reminderSub}>
                    {Platform.OS === 'web'
                      ? 'モバイルアプリで利用できます'
                      : reminderEnabled ? `毎日 ${reminderTime} に通知` : 'オフ'}
                  </Text>
                </View>
                {Platform.OS !== 'web' && (
                  <Pressable
                    style={[styles.toggle, reminderEnabled && styles.toggleOn]}
                    onPress={handleReminderToggle}
                  >
                    <Text style={styles.toggleText}>{reminderEnabled ? 'ON' : 'OFF'}</Text>
                  </Pressable>
                )}
              </View>
              {Platform.OS !== 'web' && reminderEnabled && (
                <Pressable style={styles.timeBtn} onPress={() => setTimePickerVisible(true)}>
                  <Text style={styles.timeBtnText}>時刻を変更: {reminderTime}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Early access */}
          <View style={styles.earlyAccessCard}>
            <Text style={styles.earlyAccessTitle}>🎉 アーリーアクセス期間中</Text>
            <Text style={styles.earlyAccessSub}>
              現在、全機能を無料でご利用いただけます。{'\n'}ネイティブアプリ公開時に有料プランへ移行予定です。
            </Text>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>

      {/* Edit modal */}
      <Modal visible={!!editingTask} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editTitle}>タスクを編集</Text>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus maxLength={100} returnKeyType="done"
              onSubmitEditing={handleEditSave}
              placeholderTextColor={colors.textDisabled}
            />
            <View style={styles.editActions}>
              <Pressable
                style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => { setEditingTask(null); setEditTitle(''); }}
              >
                <Text style={styles.editCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.editSaveBtn, !editTitle.trim() && styles.editSaveBtnDisabled, pressed && { opacity: 0.85 }]}
                onPress={handleEditSave}
                disabled={!editTitle.trim()}
              >
                <Text style={styles.editSaveText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time picker */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <Pressable style={styles.timeOverlay} onPress={() => setTimePickerVisible(false)}>
          <View style={styles.timeSheet}>
            <Text style={styles.timeSheetTitle}>通知時刻を選択</Text>
            {TIME_OPTIONS.map((t) => (
              <Pressable
                key={t}
                style={({ pressed }) => [styles.timeOption, reminderTime === t && styles.timeOptionActive, pressed && { opacity: 0.7 }]}
                onPress={() => handleTimeSelect(t)}
              >
                <Text style={[styles.timeOptionText, reminderTime === t && styles.timeOptionTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.headerText,
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.headerBorder,
  },
  statCardMid: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  statNum: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.headerText,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.headerTextSub,
    marginTop: 2,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -spacing.lg,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCardIcon: { fontSize: 32, marginBottom: spacing.xs },
  emptyCardText: { fontSize: fontSize.md, color: colors.textMain, fontWeight: fontWeight.medium, textAlign: 'center' },
  emptyCardHint: { fontSize: fontSize.sm, color: colors.textSub, textAlign: 'center' },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: '30%',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeEmoji: { fontSize: 28 },
  badgeName: { fontSize: fontSize.xs, color: colors.textMain, fontWeight: fontWeight.medium, textAlign: 'center' },
  badgeDate: { fontSize: 10, color: colors.textMuted },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textMain },
  reminderSub: { fontSize: fontSize.xs, color: colors.textSub, marginTop: spacing.xs },
  timeBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  timeBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  toggle: {
    backgroundColor: colors.textDisabled,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.surface },
  earlyAccessCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  earlyAccessTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  earlyAccessSub: { fontSize: fontSize.sm, color: colors.textSub, textAlign: 'center', lineHeight: 20 },
  editOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)', padding: spacing.lg,
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
    ...shadow.card,
  },
  editTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textMain, textAlign: 'center' },
  editInput: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.md, color: colors.textMain,
    borderWidth: 1.5, borderColor: colors.border,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  editCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  editCancelText: { fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.medium },
  editSaveBtn: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: radius.full, backgroundColor: colors.primary },
  editSaveBtnDisabled: { backgroundColor: colors.textDisabled },
  editSaveText: { fontSize: fontSize.md, color: colors.surface, fontWeight: fontWeight.semibold },
  timeOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  timeSheet: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, width: 240, gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  timeSheetTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textMain, textAlign: 'center', marginBottom: spacing.sm },
  timeOption: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  timeOptionActive: { backgroundColor: colors.primaryLight },
  timeOptionText: { fontSize: fontSize.md, color: colors.textSub },
  timeOptionTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
});
