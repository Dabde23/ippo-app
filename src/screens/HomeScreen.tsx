import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { TaskCard } from '../components/TaskCard';
import { XPBar } from '../components/XPBar';
import { useAppStore, Priority, Task, today } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

const PRIORITY_OPTIONS: { value: Priority; label: string; emoji: string }[] = [
  { value: 'high',   label: '高',  emoji: '🔴' },
  { value: 'normal', label: '通常', emoji: '🟡' },
  { value: 'low',    label: '低',  emoji: '🟢' },
];

export function HomeScreen() {
  const { tasks, xp, streak, addTask, editTask, todayTaskCount, todayCompletedCount } = useAppStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [inputTitle, setInputTitle] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('normal');

  const todayCount = todayTaskCount();
  const completedCount = todayCompletedCount();

  const todayTasks = tasks.filter((t) => t.createdAt === today());
  const incompleteTasks = todayTasks.filter((t) => !t.completed);
  const completedTasks = todayTasks.filter((t) => t.completed);

  function openAddModal() {
    setEditingTask(null);
    setInputTitle('');
    setSelectedPriority('normal');
    setModalVisible(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setInputTitle(task.title);
    setSelectedPriority(task.priority);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingTask(null);
    setInputTitle('');
    setSelectedPriority('normal');
  }

  function handleSave() {
    const title = inputTitle.trim();
    if (!title) return;
    if (editingTask) {
      editTask(editingTask.id, title, selectedPriority);
    } else {
      addTask(title, selectedPriority);
    }
    closeModal();
  }

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
              <Text style={styles.statsNum}>{completedCount}/{todayCount}</Text>
              <Text style={styles.statsLabel}>完了</Text>
            </View>
          </View>
        </View>

        {/* XP Bar */}
        <XPBar xp={xp} />

        {/* Task list */}
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {todayTasks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>まだタスクがありません</Text>
              <Text style={styles.emptyHint}>下のボタンで追加しましょう！</Text>
            </View>
          ) : (
            <>
              {incompleteTasks.map((item) => (
                <TaskCard key={item.id} task={item} onEdit={() => openEditModal(item)} />
              ))}
              {completedTasks.length > 0 && (
                <>
                  <View style={styles.sectionDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerLabel}>完了 {completedTasks.length}件</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  {completedTasks.map((item) => (
                    <TaskCard key={item.id} task={item} onEdit={() => openEditModal(item)} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Add button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>＋</Text>
          <Text style={styles.fabText}>タスクを追加</Text>
        </TouchableOpacity>

        {/* Add / Edit task modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'タスクを編集' : 'タスクを追加'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="何をしますか？"
                placeholderTextColor={colors.textDisabled}
                value={inputTitle}
                onChangeText={setInputTitle}
                autoFocus
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              <Text style={styles.priorityLabel}>優先度</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.priorityBtn,
                      selectedPriority === opt.value && styles.priorityBtnActive,
                    ]}
                    onPress={() => setSelectedPriority(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.priorityBtnEmoji}>{opt.emoji}</Text>
                    <Text
                      style={[
                        styles.priorityBtnText,
                        selectedPriority === opt.value && styles.priorityBtnTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addBtn, !inputTitle.trim() && styles.addBtnDisabled]}
                  onPress={handleSave}
                  disabled={!inputTitle.trim()}
                >
                  <Text style={styles.addBtnText}>
                    {editingTask ? '保存' : '追加'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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
  list: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    left: spacing.md,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSub,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  priorityBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  priorityBtnEmoji: {
    fontSize: fontSize.sm,
  },
  priorityBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  priorityBtnTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  addBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  addBtnDisabled: {
    backgroundColor: colors.locked,
  },
  addBtnText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.semibold,
  },
});
