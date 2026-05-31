import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { Task, useAppStore, XP_PER_TASK } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

interface Props {
  task: Task;
  onEdit: () => void;
}

export function TaskCard({ task, onEdit }: Props) {
  const completeTask = useAppStore((s) => s.completeTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  function handleDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm(`「${task.title}」を削除しますか？`)) {
        deleteTask(task.id);
      }
      return;
    }
    Alert.alert('タスクを削除', `「${task.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  }

  const accentColor = task.completed ? colors.success : colors.primary;

  return (
    <View style={[styles.card, task.completed && styles.completedCard]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <Pressable
        style={styles.checkArea}
        onPress={() => !task.completed && completeTask(task.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={[styles.checkbox, { borderColor: accentColor }, task.completed && { backgroundColor: accentColor }]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      <View style={styles.body}>
        <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.completed && (
          <Text style={styles.xpLabel}>+{XP_PER_TASK} XP 獲得</Text>
        )}
      </View>

      <View style={styles.actions}>
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
          <Text style={[styles.deleteText, task.completed && styles.dimText]}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingRight: spacing.md,
    paddingLeft: 0,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedCard: {
    backgroundColor: colors.successLight,
    borderColor: '#BBF7D0',
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: spacing.md,
  },
  checkArea: {
    marginRight: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.surface,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
    lineHeight: 21,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSub,
  },
  xpLabel: {
    fontSize: fontSize.xs,
    color: colors.xpGold,
    fontWeight: fontWeight.semibold,
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
    borderRadius: radius.sm,
  },
  actionBtnPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  editText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  deleteText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 20,
  },
  dimText: {
    opacity: 0.3,
  },
});
