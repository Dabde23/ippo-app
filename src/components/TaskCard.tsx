import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Alert, Platform, Modal } from 'react-native';
import { Text } from './Text';
import { Task, useAppStore, XP_PER_TASK } from '../store/useAppStore';
import {
  requestNotificationPermission,
  scheduleTaskReminder,
  cancelTaskReminder,
} from '../services/NotificationService';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

const TIME_OPTIONS = ['07:00','08:00','09:00','10:00','12:00','18:00','20:00','21:00','22:00'];

interface Props {
  task: Task;
  onEdit: () => void;
}

export function TaskCard({ task, onEdit }: Props) {
  const completeTask = useAppStore((s) => s.completeTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const setTaskReminder = useAppStore((s) => s.setTaskReminder);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  // 🔔 を表示するのは: 未完了 かつ ルーティンのデイリーインスタンスでない通常タスク
  const showReminderBtn = !task.completed && !task.routineSourceId;
  const reminderSet = !!task.taskReminderTime;

  async function handleReminderPress() {
    if (reminderSet) {
      // 設定済み → キャンセル
      setTaskReminder(task.id, null);
      await cancelTaskReminder(task.id);
      return;
    }
    setTimePickerVisible(true);
  }

  async function handleTimeSelect(time: string) {
    setTimePickerVisible(false);
    const granted = await requestNotificationPermission();
    if (!granted) return;
    setTaskReminder(task.id, time);
    await scheduleTaskReminder(task.id, task.title, time, false);
  }

  function handleComplete() {
    if (task.completed) return;
    const hadReminder = !!task.taskReminderTime;
    completeTask(task.id);
    if (hadReminder) cancelTaskReminder(task.id);
  }

  function handleDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm(`「${task.title}」を削除しますか？`)) {
        if (task.taskReminderTime) cancelTaskReminder(task.id);
        deleteTask(task.id);
      }
      return;
    }
    Alert.alert('タスクを削除', `「${task.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => {
        if (task.taskReminderTime) cancelTaskReminder(task.id);
        deleteTask(task.id);
      } },
    ]);
  }

  return (
    <View style={[styles.card, task.completed && styles.completedCard]}>
      <View style={[styles.accentBar, task.completed && styles.accentBarDone]} />

      <Pressable
        style={styles.checkArea}
        onPress={handleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      <View style={styles.body}>
        <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.completed && <Text style={styles.xpLabel}>+{XP_PER_TASK} XP</Text>}
      </View>

      <View style={styles.actions}>
        {showReminderBtn && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={handleReminderPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={reminderSet ? styles.reminderTextOn : styles.reminderTextOff}>
              {reminderSet ? `🔔 ${task.taskReminderTime}` : '🔔'}
            </Text>
          </Pressable>
        )}
        {!task.completed && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.editText}>編集</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      </View>

      {/* Task reminder time picker */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <Pressable style={styles.timeOverlay} onPress={() => setTimePickerVisible(false)}>
          <View style={styles.timeSheet}>
            <Text style={styles.timeSheetLabel}>リマインダー時刻</Text>
            <View style={styles.timeRule} />
            {TIME_OPTIONS.map((t) => (
              <Pressable
                key={t}
                style={({ pressed }) => [styles.timeOption, pressed && { opacity: 0.6 }]}
                onPress={() => handleTimeSelect(t)}
              >
                <Text style={styles.timeOptionText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: 0,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  completedCard: {
    opacity: 0.65,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  accentBarDone: {
    backgroundColor: colors.success,
  },
  checkArea: {
    marginRight: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.surface,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    lineHeight: 21,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  xpLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionBtnPressed: {
    opacity: 0.5,
  },
  editText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  deleteText: {
    fontSize: fontSize.lg,
    color: colors.danger,
    lineHeight: 20,
  },
  reminderTextOff: {
    fontSize: fontSize.md,
    color: colors.textDisabled,
  },
  reminderTextOn: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  timeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,7,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: 240,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeSheetLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    marginBottom: spacing.xs,
  },
  timeRule: { height: 1, backgroundColor: colors.ink },
  timeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  timeOptionText: { fontSize: fontSize.md, color: colors.textSub },
});
