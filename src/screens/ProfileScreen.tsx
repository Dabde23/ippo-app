import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable,
  Platform, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import { useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermission,
  scheduleReminders,
  openExactAlarmSettings,
} from '../services/NotificationService';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { TIME_OPTIONS, DAY_LABELS } from '../constants/reminder';

const FORMSPREE_URL = 'https://formspree.io/f/xqejvywv';

export function ProfileScreen() {
  const reminders = useAppStore((s) => s.reminders);
  const addReminder = useAppStore((s) => s.addReminder);
  const removeReminder = useAppStore((s) => s.removeReminder);
  const updateReminder = useAppStore((s) => s.updateReminder);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  // フィードバック state
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // 最新の reminders を使って通知を再スケジュール
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

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim() || feedbackSending) return;
    setFeedbackSending(true);
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSent(true);
      setFeedbackText('');
      setTimeout(() => {
        setFeedbackSent(false);
        setFeedbackVisible(false);
      }, 1500);
    } catch {
      Alert.alert('送信失敗', '送信できませんでした。もう一度お試しください。');
    } finally {
      setFeedbackSending(false);
    }
  }

  // リマインダー本体
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* リマインダーセクション */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>リマインダー</Text>
          <View style={styles.rule} />
          {reminderBody}
        </View>

        {/* フィードバックセクション（最下部） */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>フィードバック</Text>
          <View style={styles.rule} />
          <Text style={styles.feedbackDesc}>
            使ってみた感想や改善してほしい点を教えてください。{'\n'}開発の参考にします。
          </Text>
          <Pressable
            style={({ pressed }) => [styles.feedbackBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setFeedbackVisible(true)}
          >
            <Text style={styles.feedbackBtnText}>感想を送る</Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Feedback modal */}
      <Modal visible={feedbackVisible} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>フィードバック</Text>
            <View style={styles.rule} />
            {feedbackSent ? (
              <View style={styles.feedbackSentContainer}>
                <Text style={styles.feedbackSentText}>ありがとうございます！</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={[styles.editInput, styles.feedbackInput]}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  placeholder="使ってみた感想・改善してほしい点など"
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  autoFocus
                  editable={!feedbackSending}
                />
                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => { setFeedbackVisible(false); setFeedbackText(''); }}
                    disabled={feedbackSending}
                  >
                    <Text style={styles.editCancelText}>キャンセル</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.editSaveBtn, (!feedbackText.trim() || feedbackSending) && styles.editSaveBtnDisabled, pressed && { opacity: 0.85 }]}
                    onPress={handleFeedbackSubmit}
                    disabled={!feedbackText.trim() || feedbackSending}
                  >
                    <Text style={styles.editSaveText}>{feedbackSending ? '送信中...' : '送る'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 時刻ピッカー Modal */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <Pressable
          style={styles.timeOverlay}
          onPress={() => { setTimePickerVisible(false); setEditingReminderId(null); }}
        >
          <View style={styles.timeSheet}>
            <Text style={styles.timeSheetLabel}>時刻を選択</Text>
            <View style={styles.rule} />
            {TIME_OPTIONS.map((t) => {
              const current = reminders.find((r) => r.id === editingReminderId)?.time;
              return (
                <Pressable
                  key={t}
                  style={({ pressed }) => [
                    styles.timeOption,
                    current === t && styles.timeOptionActive,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => handleTimeSelect(t)}
                >
                  <Text style={[styles.timeOptionText, current === t && styles.timeOptionTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  // リマインダー
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
  // フィードバック
  feedbackDesc: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
  },
  feedbackBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  feedbackBtnText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  // Modals
  feedbackInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  feedbackSentContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  feedbackSentText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  editOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(26,16,7,0.5)', padding: spacing.lg,
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
  },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  editCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
  },
  editCancelText: { fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.semibold },
  editSaveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  editSaveBtnDisabled: { backgroundColor: colors.textDisabled },
  editSaveText: { fontSize: fontSize.md, color: colors.surface, fontWeight: fontWeight.bold },
  // 時刻ピッカー
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
