import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView,
  Platform, Animated, useWindowDimensions, Modal, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { PremiumLock } from './PremiumLock';
import { useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermission,
  scheduleReminders,
  openExactAlarmSettings,
} from '../services/NotificationService';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { TIME_OPTIONS, DAY_LABELS } from '../constants/reminder';

const PANEL_RATIO = 0.85;
const IS_WEB = Platform.OS === 'web';

interface Props {
  onClose: () => void;
}

// 設定ページ（独立）。リマインダー設定（フェーズ2の機能・H-6誘導込み）＋集中度記録トグルを集約。
// リマインダーは有料（isPremium でゲート）。集中度トグルは設定として常時表示。
export function SettingsPanel({ onClose }: Props) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.round(width * PANEL_RATIO);

  const reminders = useAppStore((s) => s.reminders);
  const addReminder = useAppStore((s) => s.addReminder);
  const removeReminder = useAppStore((s) => s.removeReminder);
  const updateReminder = useAppStore((s) => s.updateReminder);
  const focusPromptEnabled = useAppStore((s) => s.focusPromptEnabled);
  const toggleFocusPrompt = useAppStore((s) => s.toggleFocusPrompt);
  const isPremium = useAppStore((s) => s.isPremium);
  const togglePremium = useAppStore((s) => s.togglePremium);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

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

  // 最新の reminders を使って通知を再スケジュール（フェーズ2から移設・挙動不変）
  async function reschedule() {
    const current = useAppStore.getState().reminders;
    const msg = useAppStore.getState().reminderMessage;
    await scheduleReminders(current, msg);
  }

  async function handleAddReminder() {
    if (reminders.length >= 10) return;
    if (reminders.length === 0) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    addReminder('09:00');
    await reschedule();
  }

  async function handleRemoveReminder(id: string) {
    removeReminder(id);
    await reschedule();
  }

  async function handleToggleDay(reminder: { id: string; days: number[] }, day: number) {
    const next = reminder.days.includes(day)
      ? reminder.days.filter((d) => d !== day)
      : [...reminder.days, day].sort((a, b) => a - b);
    updateReminder(reminder.id, undefined, next);
    await reschedule();
  }

  function openTimePicker(reminderId: string) {
    setEditingReminderId(reminderId);
    setTimePickerVisible(true);
  }

  async function handleTimeSelect(time: string) {
    setTimePickerVisible(false);
    if (editingReminderId) {
      updateReminder(editingReminderId, time);
      setEditingReminderId(null);
      await reschedule();
    }
  }

  // リマインダー本体（フェーズ2から移設）。有料機能のため PremiumLock でゲートする。
  const reminderBody = (
    Platform.OS === 'web' ? (
      <View style={styles.reminderLocked}>
        <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
        <Text style={styles.reminderLockedText}>モバイルアプリ版のみ利用出来ます</Text>
      </View>
    ) : (
      <>
        {reminders.map((reminder) => (
          <View key={reminder.id} style={styles.reminderCard}>
            <View style={styles.reminderCardTop}>
              <TextInput
                style={styles.reminderNameInput}
                value={reminder.name}
                onChangeText={(text) => updateReminder(reminder.id, undefined, undefined, text)}
                onBlur={reschedule}
                placeholder="通知名を入力..."
                placeholderTextColor={colors.textDisabled}
                maxLength={50}
              />
              {reminder.routineTaskId && (
                <Ionicons name="repeat-outline" size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
              )}
              <Pressable
                style={({ pressed }) => [styles.reminderTimeBtn, pressed && { opacity: 0.6 }]}
                onPress={() => openTimePicker(reminder.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={styles.reminderTimeBtnInner}>
                  <Ionicons name="notifications" size={20} color={colors.textMain} />
                  <Text style={styles.reminderTimeText}>{reminder.time}</Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.reminderRemoveBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleRemoveReminder(reminder.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.reminderRemoveText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.dayChipRow}>
              {DAY_LABELS.map((label, i) => {
                const day = i + 1;
                const on = reminder.days.includes(day);
                return (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, on && styles.dayChipOn]}
                    onPress={() => handleToggleDay(reminder, day)}
                    hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                  >
                    <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {reminder.days.length === 0 && (
              <Text style={styles.noDayWarning}>曜日が未選択です。通知は届きません。</Text>
            )}
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.addReminderBtn,
            pressed && reminders.length < 10 && { opacity: 0.6 },
            reminders.length >= 10 && styles.addReminderBtnDisabled,
          ]}
          onPress={handleAddReminder}
        >
          <Text style={[styles.addReminderText, reminders.length >= 10 && styles.addReminderTextDisabled]}>
            {reminders.length >= 10 ? '＋ 時刻を追加（上限10件）' : '＋ 時刻を追加'}
          </Text>
        </Pressable>

        {/* H-6: 正確アラーム誘導（Android のみ・通知が数分遅れる場合の案内） */}
        {Platform.OS === 'android' && (
          <View style={styles.exactAlarmHint}>
            <Text style={styles.exactAlarmHintText}>
              通知が数分遅れて届く場合は、端末の「アラームとリマインダー」をオンにしてください。
            </Text>
            <Pressable
              style={({ pressed }) => [styles.exactAlarmBtn, pressed && { opacity: 0.6 }]}
              onPress={() => openExactAlarmSettings()}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="alarm-outline" size={16} color={colors.primary} />
              <Text style={styles.exactAlarmBtnText}>設定を開く</Text>
            </Pressable>
          </View>
        )}
      </>
    )
  );

  const panelContent = (
    <>
      <View style={styles.header}>
        <View style={styles.rule} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>設定</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* リマインダー（有料・isPremium でゲート） */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>リマインダー</Text>
          <View style={styles.rule} />
          <PremiumLock featureName="リマインダー" locked={!isPremium} onUpgrade={togglePremium}>
            {reminderBody}
          </PremiumLock>
        </View>

        {/* 集中度記録トグル（設定として常時表示） */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>トラッキング設定</Text>
          <View style={styles.rule} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleRowLabel}>タスク完了後に集中度を記録</Text>
            <Switch
              value={focusPromptEnabled}
              onValueChange={toggleFocusPrompt}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Time picker */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <Pressable style={styles.timeOverlay} onPress={() => { setTimePickerVisible(false); setEditingReminderId(null); }}>
          <View style={styles.timeSheet}>
            <Text style={styles.timeSheetLabel}>時刻を選択</Text>
            <View style={styles.rule} />
            {TIME_OPTIONS.map((t) => {
              const current = reminders.find((r) => r.id === editingReminderId)?.time;
              return (
                <Pressable
                  key={t}
                  style={({ pressed }) => [styles.timeOption, current === t && styles.timeOptionActive, pressed && { opacity: 0.6 }]}
                  onPress={() => handleTimeSelect(t)}
                >
                  <Text style={[styles.timeOptionText, current === t && styles.timeOptionTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  reminderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reminderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTimeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  reminderTimeBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderTimeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.textMain,
    letterSpacing: 0.5,
  },
  reminderNameInput: {
    fontSize: fontSize.md,
    color: colors.textMain,
    flex: 1,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginRight: spacing.sm,
  },
  reminderRemoveBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reminderRemoveText: {
    fontSize: fontSize.xl,
    color: colors.danger,
    lineHeight: 22,
  },
  dayChipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
  },
  dayChipTextOn: {
    color: colors.surface,
  },
  noDayWarning: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  reminderLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  reminderLockedText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  addReminderBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  addReminderBtnDisabled: {
    opacity: 0.4,
  },
  addReminderText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  addReminderTextDisabled: {
    color: colors.textMuted,
  },
  exactAlarmHint: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  exactAlarmHintText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  exactAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  exactAlarmBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  toggleRowLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    flex: 1,
    marginRight: spacing.md,
  },
  timeOverlay: {
    flex: 1, backgroundColor: 'rgba(26,16,7,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  timeSheet: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, width: 240, gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  timeSheetLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.primary, letterSpacing: 2.5, marginBottom: spacing.xs,
  },
  timeOption: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  timeOptionActive: { backgroundColor: colors.primaryLight },
  timeOptionText: { fontSize: fontSize.md, color: colors.textSub },
  timeOptionTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
});
