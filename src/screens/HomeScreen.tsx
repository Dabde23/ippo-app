import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, Pressable, TextInput,
  Modal, ScrollView, Platform, Switch,
  AppState, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/Text';
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
  const { tasks, xp, addTask, skipTask, setTimerTask, availableTaskCount, completedTaskCount } = useAppStore();
  const navigation = useNavigation<any>();

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [addInputVisible, setAddInputVisible] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputIsRoutine, setInputIsRoutine] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const inputRef = useRef<TextInput>(null);

  const todayStr = today();
  const doableTasks = tasks.filter((t) => t.isRoutine !== true);
  const availableTasks = doableTasks.filter((t) => !t.completed && t.skippedDate !== todayStr);
  const skippedTasks = doableTasks.filter((t) => !t.completed && t.skippedDate === todayStr);
  const completedTasks = doableTasks.filter((t) => t.completed);
  const currentTask = availableTasks.find((t) => t.id === currentTaskId) ?? null;

  // Spawn today's routine instances on mount and whenever the app surfaces.
  // Returning from the background across a date boundary must re-sync so
  // today's routine tasks get generated.
  useEffect(() => {
    useAppStore.getState().syncRoutineTasks();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        useAppStore.getState().syncRoutineTasks();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (availableTasks.length === 0) { setCurrentTaskId(null); return; }
    if (currentTaskId && availableTasks.find((t) => t.id === currentTaskId)) return;
    const picked = pickRandom(availableTasks);
    setCurrentTaskId(picked ? (picked as Task).id : null);
  }, [availableTasks.length]);

  const handleSkip = useCallback(() => {
    if (!currentTask) return;
    skipTask(currentTask.id);
    setCurrentTaskId((pickRandom(availableTasks, currentTask.id) as Task | null)?.id ?? null);
  }, [currentTask, availableTasks]);

  function openAddPopover() {
    setAddInputVisible(true);
  }

  function closeAddPopover() {
    setAddInputVisible(false);
    setInputTitle('');
    setInputIsRoutine(false);
  }

  function handleAddSubmit() {
    const title = inputTitle.trim();
    if (!title) return;
    const newId = addTask(title, inputIsRoutine);
    if (inputIsRoutine) {
      // spawn today's instance immediately so it shows up right away
      useAppStore.getState().syncRoutineTasks();
    } else {
      setCurrentTaskId((prev) => prev ?? newId);
    }
    closeAddPopover();
  }

  function openEdit(task: Task) { setEditingTask(task); setEditTitle(task.title); }
  function handleEditSave() {
    if (!editingTask || !editTitle.trim()) return;
    useAppStore.getState().editTask(editingTask.id, editTitle.trim());
    setEditingTask(null); setEditTitle('');
  }

  const available = availableTaskCount();
  const completed = completedTaskCount();
  const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRule} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.dateLabel}>{dateStr}</Text>
          </View>
          <View style={styles.headerRight}>
            {completed > 0 && (
              <View style={styles.completedTag}>
                <Text style={styles.completedTagNum}>{completed}</Text>
                <Text style={styles.completedTagLabel}>完了</Text>
              </View>
            )}
          </View>
        </View>
        <XPBar xp={xp} />
        <View style={styles.headerRule} />
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentTask ? (
          <>
            {/* Section label */}
            <Text style={styles.sectionTag}>今日のフォーカス</Text>

            {/* Focus card */}
            <View style={styles.focusCard}>
              <View style={styles.focusCardBar} />
              <View style={styles.focusCardBody}>
                <Text style={styles.focusTitle}>{currentTask.title}</Text>
                <View style={styles.focusFooter}>
                  <Text style={styles.focusXp}>+{XP_PER_TASK} XP</Text>
                  <Pressable
                    style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.65 }]}
                    onPress={handleSkip}
                  >
                    <Text style={styles.skipBtnText}>後に回す</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Action button */}
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.doneBtn, pressed && { backgroundColor: colors.primaryDark }]}
                onPress={() => { setTimerTask(currentTask!.id); navigation.navigate('Timer'); }}
              >
                <Text style={styles.doneBtnText}>開始！</Text>
              </Pressable>
            </View>
          </>
        ) : doableTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyNum}>00</Text>
            <View style={styles.headerRule} />
            <Text style={styles.emptyTitle}>タスクを追加しよう</Text>
            <Text style={styles.emptyHint}>思いついたことを何でも書いてみて</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyNum}>✓</Text>
            <View style={styles.headerRule} />
            <Text style={styles.emptyTitle}>今日はここまで！</Text>
            <Text style={styles.emptyHint}>残りは明日また表示されます</Text>
          </View>
        )}

        {/* View all */}
        {available > 0 && (
          <Pressable
            style={({ pressed }) => [styles.viewAllBtn, pressed && { opacity: 0.5 }]}
            onPress={() => setListModalVisible(true)}
          >
            <Text style={styles.viewAllText}>全タスクを見る</Text>
          </Pressable>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryDark }]}
          onPress={openAddPopover}
        >
          <Text style={styles.fabText}>＋ タスクを追加</Text>
        </Pressable>
      </View>

      {/* ── POPOVER: Add task ── */}
      <Modal
        visible={addInputVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddPopover}
        onShow={() => inputRef.current?.focus()}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.popoverOverlay} onPress={closeAddPopover}>
            <Pressable style={styles.popover} onPress={() => {}}>
            <TextInput
              ref={inputRef}
              style={styles.popoverInput}
              placeholder="何をしますか？"
              placeholderTextColor={colors.textDisabled}
              value={inputTitle}
              onChangeText={setInputTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddSubmit}
              maxLength={100}
            />
            <View style={styles.popoverToggleRow}>
              <Text style={styles.popoverToggleLabel}>毎日繰り返す</Text>
              <Switch
                value={inputIsRoutine}
                onValueChange={setInputIsRoutine}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor='#FFFFFF'
                ios_backgroundColor={colors.border}
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.popoverAddBtn, !inputTitle.trim() && styles.popoverAddBtnDisabled, pressed && { opacity: 0.85 }]}
              onPress={handleAddSubmit}
              disabled={!inputTitle.trim()}
            >
              <Text style={styles.popoverAddText}>追加</Text>
            </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Task list ── */}
      <Modal visible={listModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>すべてのタスク</Text>
              <Pressable onPress={() => setListModalVisible(false)}>
                <Text style={styles.sheetClose}>×</Text>
              </Pressable>
            </View>
            <View style={styles.headerRule} />
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing.md }}>
              {availableTasks.length > 0 && (
                <><Text style={styles.sheetSection}>残り {availableTasks.length} 件</Text>
                  {availableTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
              )}
              {skippedTasks.length > 0 && (
                <><Text style={styles.sheetSection}>今日あとで {skippedTasks.length} 件</Text>
                  {skippedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
              )}
              {completedTasks.length > 0 && (
                <><Text style={styles.sheetSection}>完了 {completedTasks.length} 件</Text>
                  {completedTasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />)}</>
              )}
              {doableTasks.length === 0 && <Text style={styles.sheetEmpty}>タスクがありません</Text>}
              <View style={{ height: spacing.xxl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Edit ── */}
      <Modal visible={!!editingTask} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>タスクを編集</Text>
            <View style={styles.headerRule} />
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
                style={({ pressed }) => [styles.editSaveBtn, !editTitle.trim() && styles.editSaveBtnDisabled, pressed && { opacity: 0.8 }]}
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
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerRule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.xs,
  },
  headerLeft: {
    gap: 2,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  completedTagNum: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.ink,
  },
  completedTagLabel: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    letterSpacing: 1,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    flexGrow: 1,
  },
  sectionTag: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  // ── Focus card ──
  focusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  focusCardBar: {
    height: 4,
    backgroundColor: colors.primary,
  },
  focusCardBody: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  focusTitle: {
    fontSize: 30,
    fontWeight: fontWeight.black,
    color: colors.ink,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  focusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusXp: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },

  // ── Action buttons ──
  actionRow: {
    marginBottom: spacing.xl,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipBtnText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  doneBtnText: {
    fontSize: fontSize.lg,
    color: colors.surface,
    fontWeight: fontWeight.black,
    letterSpacing: 1,
  },

  // ── Empty states ──
  emptyState: {
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyNum: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.black,
    color: colors.surfaceAlt,
    letterSpacing: -3,
    lineHeight: 60,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
  },

  // ── View all ──
  viewAllBtn: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },

  // ── Bottom bar ──
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    backgroundColor: colors.background,
  },
  fab: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  fabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  // ── Popover: add task ──
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,7,0.30)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  popover: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.ink,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  popoverInput: {
    fontSize: fontSize.md,
    color: colors.textMain,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  popoverToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  popoverToggleLabel: {
    fontSize: fontSize.sm,
    color: colors.textMain,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  popoverAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  popoverAddBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  popoverAddText: {
    color: colors.surface,
    fontWeight: fontWeight.black,
    fontSize: fontSize.md,
    letterSpacing: 1,
  },
  // ── Modal: list ──
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(26,16,7,0.45)',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    maxHeight: '84%',
  },
  sheetHandle: {
    width: 36, height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 1,
  },
  sheetClose: {
    fontSize: fontSize.xl, color: colors.textSub, lineHeight: 26,
  },
  sheetSection: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sheetEmpty: {
    textAlign: 'center', color: colors.textSub,
    fontSize: fontSize.md, marginTop: spacing.xl,
  },

  // ── Modal: edit ──
  editOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(26,16,7,0.45)', padding: spacing.lg,
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
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
  },
  editCancelText: {
    fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.semibold,
  },
  editSaveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  editSaveBtnDisabled: { backgroundColor: colors.textDisabled },
  editSaveText: {
    fontSize: fontSize.md, color: colors.surface, fontWeight: fontWeight.bold,
  },
});
