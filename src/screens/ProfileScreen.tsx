import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable,
  Platform, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
const FORMSPREE_URL = 'https://formspree.io/f/xqejvywv';
const EARLY_ACCESS_FORMSPREE_URL = 'https://formspree.io/f/xzdqzqnz';
import { Text } from '../components/Text';
import { XPBar } from '../components/XPBar';
import { RoutinePanel } from '../components/RoutinePanel';
import { TaskListPanel } from '../components/TaskListPanel';
import { useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermission,
  scheduleReminders,
} from '../services/NotificationService';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

const TIME_OPTIONS = ['07:00','08:00','09:00','10:00','12:00','18:00','20:00','21:00','22:00'];
const DAY_LABELS = ['月','火','水','木','金','土','日']; // index 0..6 -> day 1..7

export function ProfileScreen() {
  const { xp, badges, tasks, reminders, addReminder, removeReminder, updateReminder } = useAppStore();
  const [routinePanelVisible, setRoutinePanelVisible] = useState(false);
  const [taskListPanelVisible, setTaskListPanelVisible] = useState(false);
  const completedTotal = tasks.filter((t) => t.completed).length;
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [earlyAccessVisible, setEarlyAccessVisible] = useState(false);
  const [earlyEmail, setEarlyEmail] = useState('');
  const [earlySending, setEarlySending] = useState(false);
  const [earlySent, setEarlySent] = useState(false);


  async function handleFeedbackSubmit() {
    if (!feedbackText.trim() || feedbackSending) return;
    setFeedbackSending(true);
    try {
      await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      setFeedbackSent(true);
      setFeedbackText('');
      setTimeout(() => {
        setFeedbackSent(false);
        setFeedbackVisible(false);
      }, 1500);
    } catch {
      setFeedbackVisible(false);
      setFeedbackText('');
    } finally {
      setFeedbackSending(false);
    }
  }

  async function handleEarlyAccessSubmit() {
    const email = earlyEmail.trim();
    if (!email.includes('@') || earlySending) return;
    setEarlySending(true);
    try {
      await fetch(EARLY_ACCESS_FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'early_access_registration',
        }),
      });
      setEarlySent(true);
      setEarlyEmail('');
      setTimeout(() => {
        setEarlySent(false);
        setEarlyAccessVisible(false);
      }, 1500);
    } catch {
      setEarlyAccessVisible(false);
      setEarlyEmail('');
    } finally {
      setEarlySending(false);
    }
  }

  // 最新の reminders を使って通知を再スケジュール
  async function reschedule() {
    const current = useAppStore.getState().reminders;
    const msg = useAppStore.getState().reminderMessage;
    await scheduleReminders(current, msg);
  }

  // ＋ 時刻を追加
  async function handleAddReminder() {
    if (reminders.length >= 10) return;
    // 初回追加時に通知許可をリクエスト
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

  // 曜日チップをトグル
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

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.rule} />
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{completedTotal}</Text>
            <Text style={styles.statLabel}>完了</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{badges.length}</Text>
            <Text style={styles.statLabel}>バッジ</Text>
          </View>
        </View>

        <XPBar xp={xp} />
        <View style={styles.rule} />
      </View>

      {/* ── CONTENT ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Early access */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>アーリーアクセス</Text>
          <View style={styles.rule} />
          <Text style={styles.noteText}>
            現在、全機能を無料でご利用いただけます。{'\n'}ネイティブアプリ公開時に有料プランへ移行予定です。
          </Text>
          <Pressable
            style={({ pressed }) => [styles.earlyBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setEarlyAccessVisible(true)}
          >
            <Text style={styles.earlyBtnText}>事前登録する →</Text>
          </Pressable>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>バッジ</Text>
          <View style={styles.rule} />
          {badges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="medal-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyCardText}>タスクを完了して XP を貯めよう</Text>
              <Text style={styles.emptyCardHint}>100 XP でバッジ獲得</Text>
            </View>
          ) : (
            <View style={styles.badgeGrid}>
              {badges.map((badge) => (
                <View key={badge.id} style={styles.badgeCard}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDate}>{badge.earnedAt}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Routine management link */}
        <Pressable
          style={({ pressed }) => [styles.routineLink, pressed && { opacity: 0.6 }]}
          onPress={() => setRoutinePanelVisible(true)}
        >
          <Text style={styles.routineLinkText}>ルーティン管理</Text>
          <Text style={styles.routineLinkArrow}>→</Text>
        </Pressable>

        {/* Task list link */}
        <Pressable
          style={({ pressed }) => [styles.routineLink, pressed && { opacity: 0.6 }]}
          onPress={() => setTaskListPanelVisible(true)}
        >
          <Text style={styles.routineLinkText}>タスク一覧</Text>
          <Text style={styles.routineLinkArrow}>→</Text>
        </Pressable>

        {/* Reminder */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>毎日の通知</Text>
          <View style={styles.rule} />

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

        </View>

        {/* Feedback */}
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

      {/* Early access modal */}
      <Modal visible={earlyAccessVisible} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>アーリーアクセス事前登録</Text>
            <View style={styles.rule} />
            {earlySent ? (
              <View style={styles.feedbackSentContainer}>
                <Text style={styles.feedbackSentText}>登録ありがとうございます！</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.editInput}
                  value={earlyEmail}
                  onChangeText={setEarlyEmail}
                  placeholder="メールアドレス"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={200}
                  autoFocus
                  editable={!earlySending}
                />
                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => { setEarlyAccessVisible(false); setEarlyEmail(''); }}
                    disabled={earlySending}
                  >
                    <Text style={styles.editCancelText}>キャンセル</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.editSaveBtn, (!earlyEmail.includes('@') || earlySending) && styles.editSaveBtnDisabled, pressed && { opacity: 0.85 }]}
                    onPress={handleEarlyAccessSubmit}
                    disabled={!earlyEmail.includes('@') || earlySending}
                  >
                    <Text style={styles.editSaveText}>{earlySending ? '送信中...' : '送信'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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

      {routinePanelVisible && (
        <RoutinePanel onClose={() => setRoutinePanelVisible(false)} />
      )}
      {taskListPanelVisible && (
        <TaskListPanel onClose={() => setTaskListPanelVisible(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  headerContent: {
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  statNum: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
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
  groupLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  clearBtnText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  emptyCard: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyCardText: { fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.medium },
  emptyCardHint: { fontSize: fontSize.sm, color: colors.textMuted },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '30%',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  badgeEmoji: { fontSize: 28 },
  badgeName: { fontSize: fontSize.xs, color: colors.textMain, fontWeight: fontWeight.semibold, textAlign: 'center' },
  badgeDate: { fontSize: 12, color: colors.textMuted, letterSpacing: 0.3 },
  routineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  routineLinkText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    letterSpacing: 0.5,
  },
  routineLinkArrow: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.primary,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  reminderLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textMain },
  reminderSub: { fontSize: fontSize.xs, color: colors.textSub, marginTop: 2 },
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
  timeBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  timeBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  reminderField: { gap: spacing.xs, marginTop: spacing.sm },
  reminderFieldLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  reminderInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggle: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.ink, letterSpacing: 1 },
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
  noteCard: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noteTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  earlyBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  earlyBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
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
