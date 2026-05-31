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
        <View style={styles.rule} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>プロフィール</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{completedTotal}</Text>
            <Text style={styles.statLabel}>DONE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{badges.length}</Text>
            <Text style={styles.statLabel}>BADGE</Text>
          </View>
        </View>

        <XPBar xp={xp} />
        <View style={styles.rule} />
      </View>

      {/* ── CONTENT ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TASKS</Text>
          <View style={styles.rule} />
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
                <><Text style={styles.groupLabel}>あとで {skippedTasks.length} 件</Text>
                  {skippedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
              )}
              {completedTasks.length > 0 && (
                <><Text style={styles.groupLabel}>完了 {completedTasks.length} 件</Text>
                  {completedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
              )}
            </>
          )}
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BADGES</Text>
          <View style={styles.rule} />
          {badges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎖</Text>
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
          <Text style={styles.sectionLabel}>REMINDER</Text>
          <View style={styles.rule} />
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

        {/* Early access */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>EARLY ACCESS</Text>
          <View style={styles.rule} />
          <Text style={styles.noteText}>
            現在、全機能を無料でご利用いただけます。{'\n'}ネイティブアプリ公開時に有料プランへ移行予定です。
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={!!editingTask} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>EDIT TASK</Text>
            <View style={styles.rule} />
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
                style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.6 }]}
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
            <Text style={styles.timeSheetLabel}>SELECT TIME</Text>
            <View style={styles.rule} />
            {TIME_OPTIONS.map((t) => (
              <Pressable
                key={t}
                style={({ pressed }) => [styles.timeOption, reminderTime === t && styles.timeOptionActive, pressed && { opacity: 0.6 }]}
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  headerContent: {
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  statNum: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  groupLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  emptyCard: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyIcon: { fontSize: 28 },
  emptyCardText: { fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.medium },
  emptyCardHint: { fontSize: fontSize.sm, color: colors.textMuted },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '30%',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  badgeEmoji: { fontSize: 28 },
  badgeName: { fontSize: fontSize.xs, color: colors.textMain, fontWeight: fontWeight.semibold, textAlign: 'center' },
  badgeDate: { fontSize: 9, color: colors.textMuted, letterSpacing: 0.3 },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  reminderLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textMain },
  reminderSub: { fontSize: fontSize.xs, color: colors.textSub, marginTop: 2 },
  timeBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  timeBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  toggle: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.ink, letterSpacing: 1 },
  noteCard: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noteTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  editOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(26,16,7,0.5)', padding: spacing.lg,
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
  },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  editCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
  },
  editCancelText: { fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.semibold },
  editSaveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  editSaveBtnDisabled: { backgroundColor: colors.textDisabled },
  editSaveText: { fontSize: fontSize.md, color: colors.surface, fontWeight: fontWeight.bold },
  timeOverlay: {
    flex: 1, backgroundColor: 'rgba(26,16,7,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  timeSheet: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, width: 240, gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  timeSheetLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.primary, letterSpacing: 2.5, marginBottom: spacing.xs,
  },
  timeOption: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  timeOptionActive: { backgroundColor: colors.primaryLight },
  timeOptionText: { fontSize: fontSize.md, color: colors.textSub },
  timeOptionTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
});
