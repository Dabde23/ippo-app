import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView,
  Alert, Platform, Animated, useWindowDimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { TaskCard } from './TaskCard';
import { useAppStore, Task, today } from '../store/useAppStore';
import {
  requestNotificationPermission,
  scheduleReminders,
} from '../services/NotificationService';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { TIME_OPTIONS, DAY_LABELS } from '../constants/reminder';

const PANEL_RATIO = 0.85;
const IS_WEB = Platform.OS === 'web';

// 曜日配列 → サマリー文字列
function daysSummary(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const key = sorted.join(',');
  if (key === '1,2,3,4,5,6,7') return '毎日';
  if (key === '1,2,3,4,5') return '平日';
  if (key === '6,7') return '週末';
  return sorted.map((d) => DAY_LABELS[d - 1]).join('');
}

type Segment = 'tasks' | 'routines';

interface Props {
  onClose: () => void;
  onStartTask: (taskId: string) => void;
}

export function TaskListPanel({ onClose, onStartTask }: Props) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.round(width * PANEL_RATIO);

  const tasks = useAppStore((s) => s.tasks);
  const clearCompletedTasks = useAppStore((s) => s.clearCompletedTasks);
  const todayStr = today();
  const doableTasks = tasks.filter((t) => t.isRoutine !== true);
  const availableTasks = doableTasks.filter((t) => !t.completed && t.skippedDate !== todayStr);
  const skippedTasks = doableTasks.filter((t) => !t.completed && t.skippedDate === todayStr);
  const completedTasks = doableTasks.filter((t) => t.completed);

  // ルーティンセグメント用
  const routines = tasks.filter((t) => t.isRoutine === true);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);
  const addReminder = useAppStore((s) => s.addReminder);
  const removeReminder = useAppStore((s) => s.removeReminder);
  const updateReminder = useAppStore((s) => s.updateReminder);
  const reminders = useAppStore((s) => s.reminders);

  const [segment, setSegment] = useState<Segment>('tasks');

  // リマインダー設定モーダル state
  const [pickerRoutineId, setPickerRoutineId] = useState<string | null>(null);
  const [pickerTime, setPickerTime] = useState<string>('07:00');
  const [pickerDays, setPickerDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  const translateX = useRef(new Animated.Value(IS_WEB ? 0 : panelWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(IS_WEB ? 1 : 0)).current;

  useEffect(() => {
    if (IS_WEB) return;
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleClose() {
    if (IS_WEB) { onClose(); return; }
    Animated.parallel([
      Animated.timing(translateX, { toValue: panelWidth, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  // --- ルーティン: リマインダー操作（RoutinePanel と同等） ---
  async function reschedule() {
    const current = useAppStore.getState().reminders;
    const msg = useAppStore.getState().reminderMessage;
    await scheduleReminders(current, msg);
  }

  async function doDeleteRoutine(task: Task) {
    deleteRoutine(task.id);
    await reschedule();
  }

  function handleDeleteRoutine(task: Task) {
    if (Platform.OS === 'web') {
      if (window.confirm(`ルーティン「${task.title}」を削除しますか？`)) doDeleteRoutine(task);
      return;
    }
    Alert.alert('ルーティンを削除', `「${task.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => doDeleteRoutine(task) },
    ]);
  }

  function handleReminderPress(task: Task) {
    const linkedReminder = reminders.find((r) => r.routineTaskId === task.id);
    if (linkedReminder) {
      setPickerTime(linkedReminder.time);
      setPickerDays(linkedReminder.days);
    } else {
      setPickerTime('07:00');
      setPickerDays([1, 2, 3, 4, 5, 6, 7]);
    }
    setPickerRoutineId(task.id);
  }

  function toggleDay(day: number) {
    setPickerDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleConfirm() {
    const routineId = pickerRoutineId;
    if (!routineId || pickerDays.length === 0) return;
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const linkedReminder = reminders.find((r) => r.routineTaskId === routineId);
    const granted = await requestNotificationPermission();
    if (!granted) return;
    if (linkedReminder) {
      updateReminder(linkedReminder.id, pickerTime, pickerDays);
    } else {
      addReminder(pickerTime, pickerDays, routine.title, routine.id);
    }
    setPickerRoutineId(null);
    await reschedule();
  }

  async function handleReminderRemove() {
    const routineId = pickerRoutineId;
    if (!routineId) return;
    const linkedReminder = reminders.find((r) => r.routineTaskId === routineId);
    if (linkedReminder) removeReminder(linkedReminder.id);
    setPickerRoutineId(null);
    await reschedule();
  }

  const tasksSegment = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {doableTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>タスクがありません</Text>
          <Text style={styles.emptyHint}>ホーム画面から追加できます</Text>
        </View>
      ) : (
        <>
          {availableTasks.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>残り {availableTasks.length} 件</Text>
              {availableTasks.map((t) => (
                <TaskCard key={t.id} task={t} onStart={() => onStartTask(t.id)} />
              ))}
            </>
          )}
          {skippedTasks.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>後回しタスク {skippedTasks.length} 件</Text>
              {skippedTasks.map((t) => (
                <TaskCard key={t.id} task={t} onStart={() => onStartTask(t.id)} />
              ))}
            </>
          )}
          {completedTasks.length > 0 && (
            <>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>完了 {completedTasks.length} 件</Text>
                <Pressable
                  style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      if (window.confirm('完了済みタスクをすべて削除しますか？')) clearCompletedTasks();
                      return;
                    }
                    Alert.alert('完了済みを削除', 'すべての完了済みタスクを削除しますか？', [
                      { text: 'キャンセル', style: 'cancel' },
                      { text: '削除', style: 'destructive', onPress: clearCompletedTasks },
                    ]);
                  }}
                >
                  <Text style={styles.clearBtnText}>すべて削除</Text>
                </Pressable>
              </View>
              {completedTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </>
          )}
        </>
      )}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );

  const routinesSegment = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="repeat-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>ルーティンがありません</Text>
          <Text style={styles.emptyHint}>
            タスク追加時に「毎日繰り返す」をオンにすると、{'\n'}毎日そのタスクが自動で表示されます。
          </Text>
        </View>
      ) : (
        routines.map((task) => {
          const linkedReminder = reminders.find((r) => r.routineTaskId === task.id);
          const reminderSet = !!linkedReminder;
          return (
            <View key={task.id} style={styles.routineRow}>
              <View style={styles.routineAccentBar} />
              <View style={styles.routineBody}>
                <Text style={styles.routineTitle} numberOfLines={2}>{task.title}</Text>
                <Text style={styles.routineDate}>登録日 {task.routineCreatedAt}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.reminderBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleReminderPress(task)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View style={styles.reminderRow}>
                  <Ionicons
                    name={reminderSet ? 'notifications' : 'notifications-outline'}
                    size={20}
                    color={reminderSet ? colors.primary : colors.textDisabled}
                  />
                  {reminderSet && (
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderTime}>{linkedReminder!.time}</Text>
                      <Text style={styles.reminderDays}>{daysSummary(linkedReminder!.days)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleDeleteRoutine(task)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteText}>削除</Text>
              </Pressable>
            </View>
          );
        })
      )}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );

  const panelContent = (
    <>
      <View style={styles.header}>
        <View style={styles.rule} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>タスク一覧</Text>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeText}>閉じる ✕</Text>
          </Pressable>
        </View>
        <View style={styles.rule} />
      </View>

      {/* セグメントスイッチ */}
      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segmentTab, segment === 'tasks' && styles.segmentTabActive]}
          onPress={() => setSegment('tasks')}
        >
          <Text style={[styles.segmentText, segment === 'tasks' && styles.segmentTextActive]}>タスク</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentTab, segment === 'routines' && styles.segmentTabActive]}
          onPress={() => setSegment('routines')}
        >
          <Text style={[styles.segmentText, segment === 'routines' && styles.segmentTextActive]}>ルーティン</Text>
        </Pressable>
      </View>

      {segment === 'tasks' ? tasksSegment : routinesSegment}

      {/* ルーティン: リマインダー設定モーダル */}
      <Modal visible={pickerRoutineId !== null} transparent animationType="fade">
        <Pressable style={styles.timeOverlay} onPress={() => setPickerRoutineId(null)}>
          <Pressable style={styles.timeSheet} onPress={() => {}}>
            <Text style={styles.timeSheetLabel}>通知設定</Text>
            <View style={styles.rule} />

            <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
              {TIME_OPTIONS.map((t) => {
                const active = pickerTime === t;
                return (
                  <Pressable
                    key={t}
                    style={({ pressed }) => [
                      styles.timeOption,
                      active && styles.timeOptionActive,
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={() => setPickerTime(t)}
                  >
                    <Text style={[styles.timeOptionText, active && styles.timeOptionTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.rule} />

            <View style={styles.dayChipRow}>
              {DAY_LABELS.map((label, i) => {
                const day = i + 1;
                const on = pickerDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    style={({ pressed }) => [
                      styles.dayChip,
                      on && styles.dayChipOn,
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {pickerDays.length === 0 && (
              <Text style={styles.noDayWarning}>曜日を選択してください</Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pickerDays.length === 0 && styles.confirmBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleConfirm}
              disabled={pickerDays.length === 0}
            >
              <Text style={styles.confirmBtnText}>設定する</Text>
            </Pressable>

            {reminders.some((r) => r.routineTaskId === pickerRoutineId) && (
              <Pressable
                style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                onPress={handleReminderRemove}
              >
                <Text style={styles.removeBtnText}>通知を削除</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );

  if (IS_WEB) {
    return (
      <View style={styles.rootFixed}>
        <Pressable style={[StyleSheet.absoluteFill, styles.overlayWeb]} onPress={handleClose} />
        <View style={[styles.panel, { width: panelWidth }]}>
          {panelContent}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>
      <Animated.View style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
        {panelContent}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  rootFixed: {
    position: 'fixed' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(26,16,7,0.45)',
  },
  overlayWeb: {
    backgroundColor: 'rgba(26,16,7,0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    backgroundColor: colors.background,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.ink,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  rule: { height: 1, backgroundColor: colors.ink },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  closeBtn: { paddingVertical: spacing.xs },
  closeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  // セグメントスイッチ
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearBtnText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
    textAlign: 'center',
  },
  // --- ルーティン行 ---
  routineRow: {
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
  routineAccentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  routineBody: { flex: 1, gap: 2 },
  routineTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    lineHeight: 21,
  },
  routineDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  reminderBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    marginLeft: spacing.xs,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderInfo: { alignItems: 'flex-start' },
  reminderTime: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  reminderDays: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.xs,
  },
  deleteText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  // --- リマインダー設定モーダル ---
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
    width: 300,
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
  timeList: { maxHeight: 200 },
  timeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  timeOptionText: { fontSize: fontSize.md, color: colors.textSub },
  timeOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  dayChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dayChipText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: fontWeight.bold,
  },
  dayChipTextOn: { color: colors.primary },
  noDayWarning: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    color: colors.surface,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  removeBtn: {
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  removeBtnText: {
    color: colors.danger,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
});
