import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Task, Priority, useAppStore, XP_BY_PRIORITY } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

const PRIORITY_CONFIG: Record<Priority, { emoji: string; color: string }> = {
  high:   { emoji: '🔴', color: colors.danger },
  normal: { emoji: '🟡', color: colors.warning },
  low:    { emoji: '🟢', color: colors.success },
};

interface Props {
  task: Task;
  onEdit: () => void;
}

export function TaskCard({ task, onEdit }: Props) {
  const completeTask = useAppStore((s) => s.completeTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const isPremium = useAppStore((s) => s.isPremium);
  const config = PRIORITY_CONFIG[task.priority];

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
      {task.completed && <View style={styles.completedAccent} />}

      <TouchableOpacity
        style={styles.checkArea}
        onPress={() => !task.completed && completeTask(task.id)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[styles.title, task.completed && styles.completedTitle]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.priorityEmoji}>{config.emoji}</Text>
          {task.completed && (
            <View style={styles.xpTag}>
              <Text style={styles.xpText}>+{XP_BY_PRIORITY[task.priority]} XP</Text>
            </View>
          )}
        </View>
      </View>

      {!task.completed && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
          {isPremium && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {task.completed && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.actionIcon, styles.actionIconDim]}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadow.sm,
  },
  completedCard: {
    backgroundColor: colors.success + '12',
  },
  completedAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.success,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  checkArea: {
    marginRight: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    marginBottom: spacing.xs,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: colors.textSub,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priorityEmoji: {
    fontSize: fontSize.md,
  },
  xpTag: {
    backgroundColor: colors.xpGold + '22',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  xpText: {
    color: colors.xpGold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  actionIcon: {
    fontSize: fontSize.md,
  },
  actionIconDim: {
    opacity: 0.4,
  },
});
