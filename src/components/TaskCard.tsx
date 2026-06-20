import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Alert, Platform, Modal, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Task, useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermission,
  scheduleTaskReminder,
  cancelTaskReminder,
} from '../services/NotificationService';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { TimeWheelPicker } from './TimeWheelPicker';

interface Props {
  task: Task;
  onStart?: () => void;
}

export function TaskCard({ task, onStart }: Props) {
  const completeTask = useAppStore((s) => s.completeTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);
  const setTaskReminder = useAppStore((s) => s.setTaskReminder);
  const editTask = useAppStore((s) => s.editTask);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerTime, setPickerTime] = useState('09:00');
  const [editVisible, setEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const reminderSet = !!task.taskReminderTime;
  // ルーティンインスタンス（テンプレ由来）のリマインダーは RoutinePanel 側で管理する（QA #N01）
  const isRoutineInstance = !!task.routineSourceId;
  const canSetReminder = !isRoutineInstance;

  function handleComplete() {
    if (task.completed) return;
    const hadReminder = !!task.taskReminderTime;
    completeTask(task.id);
    if (hadReminder) cancelTaskReminder(task.id);
  }

  function openSheet() {
    setSheetVisible(true);
  }

  // ボトムシートから「リマインダー設定/編集」
  async function handleReminderTap() {
    if (reminderSet) {
      // 設定済み → 解除
      setTaskReminder(task.id, null);
      await cancelTaskReminder(task.id);
      setSheetVisible(false);
      return;
    }
    // 未設定 → 時刻ピッカー
    setSheetVisible(false);
    setPickerTime('09:00');
    setTimePickerVisible(true);
  }

  async function handleTimeConfirm() {
    const time = pickerTime;
    setTimePickerVisible(false);
    const granted = await requestNotificationPermission();
    if (!granted) {
      if (Platform.OS !== 'web') {
        Alert.alert(
          '通知の許可が必要です',
          '設定アプリから「いっぽ」の通知を許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return;
    }
    setTaskReminder(task.id, time);
    await scheduleTaskReminder(task.id, task.title, time, !!task.routineSourceId);
  }

  function openEdit() {
    setEditTitle(task.title);
    setSheetVisible(false);
    setEditVisible(true);
  }

  function handleEditSave() {
    if (!editTitle.trim()) return;
    editTask(task.id, editTitle.trim());
    setEditVisible(false);
  }

  function handleDelete() {
    setSheetVisible(false);
    if (task.routineSourceId) {
      // ルーティンインスタンス → テンプレートごと削除
      const sourceId = task.routineSourceId;
      if (Platform.OS === 'web') {
        if (window.confirm(`「${task.title}」はルーティンです。今後も含めて完全に削除しますか？`)) {
          deleteRoutine(sourceId);
        }
        return;
      }
      Alert.alert(
        'ルーティンを削除',
        `「${task.title}」はルーティンです。\n今後も含めて完全に削除しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '削除', style: 'destructive', onPress: () => deleteRoutine(sourceId) },
        ]
      );
      return;
    }
    // 単発タスク → 従来通り
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
      <View style={[styles.accentBar, task.completed ? styles.accentBarDone : (task.routineSourceId ? styles.accentBarRoutine : null)]} />

      {/* チェックボックス */}
      <Pressable
        onPress={handleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.checkArea}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      {/* タイトル */}
      <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
        {task.title}
      </Text>

      {/* 露出アクション（未完了時のみ） */}
      {!task.completed && (
        <>
          {/* 🔔 状態チップ（リマインダー設定済 & 非ルーティンインスタンス） */}
          {reminderSet && canSetReminder && (
            <Pressable
              style={({ pressed }) => [styles.reminderChip, pressed && { opacity: 0.6 }]}
              onPress={openSheet}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.reminderChipText}>🔔 {task.taskReminderTime}</Text>
            </Pressable>
          )}
          {/* 開始ボタン */}
          {onStart && (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={onStart}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.startText}>開始</Text>
            </Pressable>
          )}
        </>
      )}

      {/* ⋯ ボタン（常時・控えめ） */}
      <Pressable
        style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.5 }]}
        onPress={openSheet}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
      </Pressable>

      {/* ボトムシート */}
      <Modal visible={sheetVisible} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{task.title}</Text>
            <View style={styles.sheetRule} />

            {/* リマインダー（未完了 & 非ルーティンインスタンスのみ） */}
            {!task.completed && canSetReminder && (
              <Pressable
                style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
                onPress={handleReminderTap}
              >
                <Ionicons
                  name={reminderSet ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={reminderSet ? colors.primary : colors.textSub}
                />
                <Text style={styles.sheetRowText}>
                  {reminderSet ? `リマインダー解除（${task.taskReminderTime}）` : 'リマインダーを設定'}
                </Text>
              </Pressable>
            )}

            {/* 編集（未完了のみ） */}
            {!task.completed && (
              <Pressable
                style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
                onPress={openEdit}
              >
                <Ionicons name="create-outline" size={20} color={colors.textSub} />
                <Text style={styles.sheetRowText}>編集</Text>
              </Pressable>
            )}

            {/* 削除（赤・隔離） */}
            <Pressable
              style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.sheetRowText, styles.sheetDeleteText]}>削除</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* タイムピッカー */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <Pressable style={styles.timeOverlay} onPress={() => setTimePickerVisible(false)}>
          <Pressable style={styles.timeSheet} onPress={() => {}}>
            <Text style={styles.timeSheetLabel}>リマインダー時刻</Text>
            <View style={styles.timeRule} />
            {timePickerVisible && (
              <TimeWheelPicker value={pickerTime} onChange={setPickerTime} />
            )}
            <Pressable
              style={({ pressed }) => [styles.timeConfirmBtn, pressed && { opacity: 0.7 }]}
              onPress={handleTimeConfirm}
            >
              <Text style={styles.timeConfirmText}>決定</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 編集モーダル */}
      <Modal visible={editVisible} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>タスクを編集</Text>
            <View style={styles.editRule} />
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
                style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.6 }]}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.editCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.editSaveBtn,
                  !editTitle.trim() && styles.editSaveBtnDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleEditSave}
                disabled={!editTitle.trim()}
              >
                <Text style={styles.editSaveText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
    paddingRight: spacing.sm,
    paddingLeft: 0,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
    gap: spacing.xs,
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
  accentBarRoutine: {
    backgroundColor: colors.success,
  },
  checkArea: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
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
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    lineHeight: 21,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  reminderChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  reminderChipText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionBtnPressed: {
    opacity: 0.5,
  },
  startText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  moreBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  // --- ボトムシート ---
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,7,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    gap: spacing.xs,
  },
  sheetTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
    marginBottom: spacing.xs,
  },
  sheetRule: { height: 1, backgroundColor: colors.border, marginBottom: spacing.xs },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  sheetRowPressed: { backgroundColor: colors.background },
  sheetRowText: {
    fontSize: fontSize.md,
    color: colors.textMain,
    fontWeight: fontWeight.semibold,
  },
  sheetDeleteText: {
    color: colors.danger,
  },
  // --- タイムピッカー ---
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
  timeConfirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  timeConfirmText: {
    color: colors.surface,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
    letterSpacing: 1,
  },
  // --- 編集モーダル ---
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
  editRule: { height: 1, backgroundColor: colors.ink },
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
