import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { XPBar } from '../components/XPBar';
import { TaskCard } from '../components/TaskCard';
import { useAppStore, Task, today, XP_PER_TASK } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

function pickRandom<T>(arr: T[], excludeId?: string): T | null {
  const pool = excludeId
    ? (arr as unknown as Task[]).filter((t) => t.id !== excludeId) as unknown as T[]
    : arr;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function HomeScreen() {
  const { tasks, xp, streak, addTask, completeTask, skipTask, availableTaskCount, completedTaskCount } = useAppStore();

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [addInputVisible, setAddInputVisible] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [listModalVisible, setListModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const todayStr = today();
  const availableTasks = tasks.filter((t) => !t.completed && t.skippedDate !== todayStr);
  const skippedTasks = tasks.filter((t) => !t.completed && t.skippedDate === todayStr);
  const completedTasks = tasks.filter((t) => t.completed);
  const currentTask = availableTasks.find((t) => t.id === currentTaskId) ?? null;
  const nextTasks = availableTasks.filter((t) => t.id !== currentTaskId).slice(0, 2);

  useEffect(() => {
    if (availableTasks.length === 0) { setCurrentTaskId(null); return; }
    if (currentTaskId && availableTasks.find((t) => t.id === currentTaskId)) return;
    const picked = pickRandom(availableTasks);
    setCurrentTaskId(picked ? (picked as Task).id : null);
  }, [availableTasks.length]);

  const handleComplete = useCallback(() => {
    if (!currentTask) return;
    completeTask(currentTask.id);
    const next = pickRandom(availableTasks, currentTask.id) as Task | null;
    setCurrentTaskId(next?.id ?? null);
  }, [currentTask, availableTasks]);

  const handleSkip = useCallback(() => {
    if (!currentTask) return;
    skipTask(currentTask.id);
    const next = pickRandom(availableTasks, currentTask.id) as Task | null;
    setCurrentTaskId(next?.id ?? null);
  }, [currentTask, availableTasks]);

  function handleAddSubmit() {
    const title = inputTitle.trim();
    if (!title) return;
    const newId = addTask(title);
    setInputTitle('');
    setAddInputVisible(false);
    setCurrentTaskId((prev) => prev ?? newId);
  }

  function openEdit(task: Task) { setEditingTask(task); setEditTitle(task.title); }

  function handleEditSave() {
    if (!editingTask || !editTitle.trim()) return;
    useAppStore.getState().editTask(editingTask.id, editTitle.trim());
    setEditingTask(null);
    setEditTitle('');
  }

  const available = availableTaskCount();
  const completed = completedTaskCount();
  const dateStr = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER (sky blue) ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.appName}>いっぽ</Text>
            <Text style={styles.dateLabel}>{dateStr}</Text>
          </View>
          <View style={styles.headerBadges}>
            {streak >= 2 && (
              <View style={styles.streakChip}>
                <Text style={styles.streakChipText}>🔥 {streak}日</Text>
              </View>
            )}
            <View style={styles.completedChip}>
              <Text style={styles.completedChipNum}>{completed}</Text>
              <Text style={styles.completedChipLabel}> 完了</Text>
            </View>
          </View>
        </View>
        <XPBar xp={xp} variant="header" />
      </View>

      {/* ── CONTENT (light bg, rounded top) ── */}
      <View style={styles.content}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Focus area */}
          {currentTask ? (
            <View style={styles.focusSection}>
              <Text style={styles.focusLabel}>今これをやろう</Text>
              <View style={styles.focusCard}>
                <View style={styles.focusAccentBar} />
                <View style={styles.focusBody}>
                  <Text style={styles.focusTitle}>{currentTask.title}</Text>
                  <View style={styles.xpPill}>
                    <Text style={styles.xpPillText}>完了で +{XP_PER_TASK} XP</Text>
                  </View>
                </View>
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
                  onPress={handleSkip}
                >
                  <Text style={styles.skipBtnText}>あとで</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
                  onPress={handleComplete}
                >
                  <Text style={styles.doneBtnText}>やった！ ✓</Text>
                </Pressable>
              </View>
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyTitle}>タスクを追加しよう</Text>
              <Text style={styles.emptyHint}>思いついたことを何でも書いてみて</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>今日はここまで！</Text>
              <Text style={styles.emptyHint}>残りは明日また表示されます</Text>
            </View>
          )}

          {/* Next tasks preview */}
          {nextTasks.length > 0 && (
            <View style={styles.nextSection}>
              <Text style={styles.nextLabel}>次のタスク</Text>
              {nextTasks.map((t) => (
                <View key={t.id} style={styles.nextRow}>
                  <View style={styles.nextDot} />
                  <Text style={styles.nextTitle} numberOfLines={1}>{t.title}</Text>
                </View>
              ))}
              {available > 2 && (
                <Text style={styles.nextMore}>他 {available - 2} 件…</Text>
              )}
            </View>
          )}

          {/* View all link */}
          {available > 0 && (
            <Pressable
              style={({ pressed }) => [styles.viewAllBtn, pressed && styles.viewAllBtnPressed]}
              onPress={() => setListModalVisible(true)}
            >
              <Text style={styles.viewAllText}>全タスクを見る  {available} 件 →</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Bottom: add task */}
        <View style={styles.bottomBar}>
          {addInputVisible ? (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="何をしますか？"
                placeholderTextColor={colors.textDisabled}
                value={inputTitle}
                onChangeText={setInputTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddSubmit}
                maxLength={100}
              />
              <Pressable
                style={({ pressed }) => [styles.addBtn, !inputTitle.trim() && styles.addBtnDisabled, pressed && styles.addBtnPressed]}
                onPress={handleAddSubmit}
                disabled={!inputTitle.trim()}
              >
                <Text style={styles.addBtnText}>追加</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => { setAddInputVisible(false); setInputTitle(''); }}>
                <Text style={styles.cancelBtnText}>×</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
              onPress={() => setAddInputVisible(true)}
            >
              <Text style={styles.fabIcon}>＋</Text>
              <Text style={styles.fabText}>タスクを追加</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── MODAL: Task list ── */}
      <Modal visible={listModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>全タスク</Text>
              <Pressable onPress={() => setListModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableTasks.length > 0 && (
                <>
                  <Text style={styles.sheetSection}>残り {availableTasks.length} 件</Text>
                  {availableTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}
                </>
              )}
              {skippedTasks.length > 0 && (
                <>
                  <Text style={styles.sheetSection}>今日あとで  {skippedTasks.length} 件</Text>
                  {skippedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}
                </>
              )}
              {completedTasks.length > 0 && (
                <>
                  <Text style={styles.sheetSection}>完了  {completedTasks.length} 件</Text>
                  {completedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}
                </>
              )}
              {tasks.length === 0 && <Text style={styles.sheetEmpty}>タスクがありません</Text>}
              <View style={{ height: spacing.xxl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Edit task ── */}
      <Modal visible={!!editingTask} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editTitle}>タスクを編集</Text>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={handleEditSave}
              placeholderTextColor={colors.textDisabled}
            />
            <View style={styles.editActions}>
              <Pressable
                style={({ pressed }) => [styles.editCancelBtn, pressed && styles.btnPressed]}
                onPress={() => { setEditingTask(null); setEditTitle(''); }}
              >
                <Text style={styles.editCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.editSaveBtn, !editTitle.trim() && styles.editSaveBtnDisabled, pressed && styles.editSaveBtnPressed]}
                onPress={handleEditSave}
                disabled={!editTitle.trim()}
              >
                <Text style={styles.editSaveText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.headerText,
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: colors.headerTextSub,
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  streakChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.headerBorder,
  },
  streakChipText: {
    fontSize: fontSize.xs,
    color: colors.headerText,
    fontWeight: fontWeight.semibold,
  },
  completedChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.headerBorder,
  },
  completedChipNum: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.headerText,
  },
  completedChipLabel: {
    fontSize: fontSize.xs,
    color: colors.headerTextSub,
  },

  // ── Content ──
  content: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -spacing.lg,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    flexGrow: 1,
  },

  // ── Focus task ──
  focusSection: {
    gap: spacing.md,
  },
  focusLabel: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  focusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  focusAccentBar: {
    height: 5,
    backgroundColor: colors.primary,
    width: '100%',
  },
  focusBody: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  focusTitle: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
    lineHeight: 36,
  },
  xpPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  xpPillText: {
    fontSize: fontSize.xs,
    color: colors.xpGold,
    fontWeight: fontWeight.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skipBtnText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  doneBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadow.soft,
  },
  doneBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  doneBtnText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.7,
  },

  // ── Empty states ──
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Next tasks preview ──
  nextSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  nextDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  nextTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  nextMore: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },

  // ── View all ──
  viewAllBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  viewAllBtnPressed: {
    opacity: 0.6,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // ── Bottom bar ──
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: spacing.sm,
    ...shadow.card,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
  },
  fabIcon: {
    fontSize: fontSize.lg,
    color: colors.surface,
    fontWeight: fontWeight.bold,
    lineHeight: 22,
  },
  fabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  textInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMain,
    paddingVertical: spacing.xs,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  addBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  addBtnText: {
    color: colors.surface,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.xs,
  },
  cancelBtnText: {
    color: colors.textSub,
    fontSize: fontSize.lg,
    lineHeight: 22,
  },

  // ── Modals ──
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    maxHeight: '84%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: fontSize.xl,
    color: colors.textSub,
    lineHeight: 26,
  },
  sheetSection: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sheetEmpty: {
    textAlign: 'center',
    color: colors.textSub,
    fontSize: fontSize.md,
    marginTop: spacing.xl,
  },
  editOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: spacing.lg,
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
    ...shadow.card,
  },
  editTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  editInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  editCancelText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  editSaveBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  editSaveBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  editSaveBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  editSaveText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.semibold,
  },
});
