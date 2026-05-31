import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Task, useAppStore, XP_PER_TASK } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

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
    Alert.alert(
      'タスクを削除',
      `「${task.title}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => deleteTask(task.id) },
      ]
    );
  }

  return (
    <View style={[styles.card, task.completed && styles.completedCard]}>
      {task.completed && <View style={styles.completedBar} />}

      <TouchableOpacity
        style={styles.checkArea}
        onPress={() => !task.completed && completeTask(task.id)}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, task.completed && styles.completedTitle]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.completed && (
          <Text style={styles.xpLabel}>+{XP_PER_TASK} XP</Text>
        )}
      </View>

      <View style={styles.actions}>
        {!task.completed && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.editText}>編集</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.deleteText, task.completed && styles.dimText]}>×</Text>
        </TouchableOpacity>
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
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  completedBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.success,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  checkArea: {
    marginRight: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
    lineHeight: 21,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: colors.textSub,
  },
  xpLabel: {
    fontSize: fontSize.xs,
    color: colors.xpGold,
    fontWeight: fontWeight.medium,
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
  editText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  deleteText: {
    fontSize: fontSize.lg,
    color: colors.textSub,
    lineHeight: 20,
  },
  dimText: {
    opacity: 0.35,
  },
});
