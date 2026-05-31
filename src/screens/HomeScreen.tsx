import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

  useEffect(() => {
    if (availableTasks.length === 0) {
      setCurrentTaskId(null);
      return;
    }
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

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditTitle(task.title);
  }

  function handleEditSave() {
    if (!editingTask || !editTitle.trim()) return;
    useAppStore.getState().editTask(editingTask.id, editTitle.trim());
    setEditingTask(null);
    setEditTitle('');
  }

  const available = availableTaskCount();
  const completed = completedTaskCount();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>いっぽ</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {streak >= 2 && (
              <View style={styles.streakBox}>
                <Text style={styles.streakNum}>🔥 {streak}</Text>
                <Text style={styles.streakLabel}>日連続</Text>
              </View>
            )}
            <View style={styles.statsBox}>
              <Text style={styles.statsNum}>{completed}</Text>
              <Text style={styles.statsLabel}>完了</Text>
            </View>
          </View>
        </View>

        <XPBar xp={xp} />

        {/* Focus area */}
        <View style={styles.focusArea}>
          {currentTask ? (
            <>
              <Text style={styles.focusHint}>今これをやろう</Text>
              <View style={styles.focusCard}>
                <Text style={styles.focusEmoji}>📝</Text>
                <Text style={styles.focusTitle}>{currentTask.title}</Text>
                <Text style={styles.focusXp}>完了で +{XP_PER_TASK} XP</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.75}>
                  <Text style={styles.skipBtnText}>あとで</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.doneBtn} onPress={handleComplete} activeOpacity={0.85}>
                  <Text style={styles.doneBtnText}>✓ やった！</Text>
                </TouchableOpacity>
              </View>
            </>
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
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {available > 0 && (
            <TouchableOpacity
              style={styles.listBtn}
              onPress={() => setListModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.listBtnText}>全タスクを見る（残り {available} 件）</Text>
            </TouchableOpacity>
          )}

          {addInputVisible ? (
            <View style={styles.inlineAdd}>
              <TextInput
                style={styles.inlineInput}
                placeholder="何をしますか？"
                placeholderTextColor={colors.textDisabled}
                value={inputTitle}
                onChangeText={setInputTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddSubmit}
                maxLength={100}
              />
              <TouchableOpacity
                style={[styles.inlineAddBtn, !inputTitle.trim() && styles.inlineAddBtnDisabled]}
                onPress={handleAddSubmit}
                disabled={!inputTitle.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.inlineAddBtnText}>追加</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inlineCancelBtn}
                onPress={() => { setAddInputVisible(false); setInputTitle(''); }}
              >
                <Text style={styles.inlineCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setAddInputVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.fabIcon}>＋</Text>
              <Text style={styles.fabText}>タスクを追加</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Task list modal */}
      <Modal visible={listModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>全タスク</Text>
              <TouchableOpacity onPress={() => setListModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableTasks.length > 0 && (
                <>
                  <Text style={styles.listSectionLabel}>残り {availableTasks.length} 件</Text>
                  {availableTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />
                  ))}
                </>
              )}

              {skippedTasks.length > 0 && (
                <>
                  <Text style={styles.listSectionLabel}>今日あとで ({skippedTasks.length} 件)</Text>
                  {skippedTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />
                  ))}
                </>
              )}

              {completedTasks.length > 0 && (
                <>
                  <Text style={styles.listSectionLabel}>完了 {completedTasks.length} 件</Text>
                  {completedTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />
                  ))}
                </>
              )}

              {tasks.length === 0 && (
                <Text style={styles.listEmpty}>タスクがありません</Text>
              )}
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit task modal */}
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
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => { setEditingTask(null); setEditTitle(''); }}
              >
                <Text style={styles.editCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, !editTitle.trim() && styles.editSaveBtnDisabled]}
                onPress={handleEditSave}
                disabled={!editTitle.trim()}
              >
                <Text style={styles.editSaveText}>保存</Text>
              </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakBox: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  streakNum: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#EA580C',
  },
  streakLabel: {
    fontSize: fontSize.xs,
    color: '#EA580C',
  },
  statsBox: {
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statsNum: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statsLabel: {
    fontSize: fontSize.xs,
    color: colors.textSub,
  },
  focusArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  focusHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    letterSpacing: 0.5,
  },
  focusCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.md,
  },
  focusEmoji: {
    fontSize: 48,
  },
  focusTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
    lineHeight: 32,
  },
  focusXp: {
    fontSize: fontSize.sm,
    color: colors.xpGold,
    fontWeight: fontWeight.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  doneBtnText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  listBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  listBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textDecorationLine: 'underline',
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...shadow.md,
  },
  fabIcon: {
    fontSize: fontSize.xl,
    color: colors.surface,
    fontWeight: fontWeight.bold,
  },
  fabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  inlineAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadow.sm,
  },
  inlineInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMain,
    paddingVertical: spacing.xs,
  },
  inlineAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inlineAddBtnDisabled: {
    backgroundColor: colors.locked,
  },
  inlineAddBtnText: {
    color: colors.surface,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  inlineCancelBtn: {
    padding: spacing.xs,
  },
  inlineCancelText: {
    color: colors.textSub,
    fontSize: fontSize.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  modalClose: {
    fontSize: fontSize.lg,
    color: colors.textSub,
    padding: spacing.xs,
  },
  listSectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  listEmpty: {
    textAlign: 'center',
    color: colors.textSub,
    fontSize: fontSize.md,
    marginTop: spacing.xl,
  },
  editOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing.lg,
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
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
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  editSaveBtnDisabled: {
    backgroundColor: colors.locked,
  },
  editSaveText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.semibold,
  },
});
