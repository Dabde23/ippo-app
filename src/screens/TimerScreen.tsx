import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '../components/Text';
import { TimerDisplay } from '../components/TimerDisplay';
import { FocusModal } from '../components/FocusModal';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { scheduleTimerEndNotification, cancelTimerEndNotification, cancelTaskReminder } from '../services/NotificationService';

const PRESETS = [
  { label: '15分', work: 10, break: 5 },
  { label: '30分', work: 25, break: 5 },
  { label: '1時間', work: 50, break: 10 },
] as const;

function getBreakMinutes(workMin: number): number {
  return workMin === 50 ? 10 : 5;
}

const RING_SIZE = 240;
const RING_STROKE = 16;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

export function TimerScreen() {
  const { timerTaskId, tasks, completeTask, skipTask, setTimerTask, timerWorkMinutes, setTimerWorkMinutes } = useAppStore();

  const [seconds, setSeconds] = useState(timerWorkMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [customInput, setCustomInput] = useState('');
  // 集中度モーダル: 完了タスクのスナップショットを保持して表示
  const [focusTarget, setFocusTarget] = useState<{ id: string; title: string } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autostartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseEndTimeRef = useRef<number | null>(null); // タイムスタンプ（ms）: 現在フェーズの終了予定時刻

  const workSec = timerWorkMinutes * 60;
  const breakSec = getBreakMinutes(timerWorkMinutes) * 60;

  const navigation = useNavigation<any>();
  const timerTask = tasks.find((t) => t.id === timerTaskId) ?? null;

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelTimerEndNotification();
      return;
    }
    intervalRef.current = setInterval(() => {
      if (phaseEndTimeRef.current === null) return;
      const remaining = phaseEndTimeRef.current - Date.now();
      if (remaining <= 0) {
        // フェーズ切替
        const next = mode === 'work' ? 'break' : 'work';
        const nextSec = next === 'work' ? workSec : breakSec;
        phaseEndTimeRef.current = Date.now() + nextSec * 1000;
        setMode(next);
        setSeconds(nextSec);
        const endBody = next === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
        scheduleTimerEndNotification(nextSec, endBody);
      } else {
        setSeconds(Math.ceil(remaining / 1000));
      }
    }, 250);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, workSec, breakSec]);

  useEffect(() => {
    return () => { if (autostartRef.current) clearTimeout(autostartRef.current); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active' || !isRunning || phaseEndTimeRef.current === null) return;
      const now = Date.now();
      let endTime = phaseEndTimeRef.current;
      let currentMode = mode;
      // バックグラウンド中に経過したフェーズを高速フォワード
      while (endTime <= now) {
        currentMode = currentMode === 'work' ? 'break' : 'work';
        const nextSec = currentMode === 'work' ? workSec : breakSec;
        endTime += nextSec * 1000;
      }
      phaseEndTimeRef.current = endTime;
      const remaining = Math.ceil((endTime - now) / 1000);
      setSeconds(remaining);
      if (currentMode !== mode) {
        setMode(currentMode);
        cancelTimerEndNotification();
        const body = currentMode === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
        scheduleTimerEndNotification(remaining, body);
      }
    });
    return () => sub.remove();
  }, [isRunning, mode, workSec, breakSec]);

  useEffect(() => {
    if (!timerTaskId) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    cancelTimerEndNotification();
    setIsRunning(false);
    setSeconds(timerWorkMinutes * 60);
    setMode('work');
    phaseEndTimeRef.current = null;
    autostartRef.current = setTimeout(() => {
      phaseEndTimeRef.current = Date.now() + timerWorkMinutes * 60 * 1000;
      setIsRunning(true);
      scheduleTimerEndNotification(timerWorkMinutes * 60, 'ブレイクの時間です');
    }, 2000);
    return () => { if (autostartRef.current) clearTimeout(autostartRef.current); };
  }, [timerTaskId]);

  function handleStartPause() {
    const newRunning = !isRunning;
    if (newRunning) {
      phaseEndTimeRef.current = Date.now() + seconds * 1000;
      const body = mode === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
      scheduleTimerEndNotification(seconds, body);
    }
    setIsRunning(newRunning);
  }

  function applyPreset(workMin: number) {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    cancelTimerEndNotification();
    setTimerWorkMinutes(workMin);
    setCustomInput('');
    setMode('work');
    const sec = workMin * 60;
    setSeconds(sec);
    setIsRunning(false);
    phaseEndTimeRef.current = null;
    autostartRef.current = setTimeout(() => {
      phaseEndTimeRef.current = Date.now() + sec * 1000;
      setIsRunning(true);
      scheduleTimerEndNotification(sec, 'ブレイクの時間です');
    }, 2000);
  }

  const handleComplete = useCallback(() => {
    if (!timerTask) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    cancelTimerEndNotification();
    if (timerTask.taskReminderTime) cancelTaskReminder(timerTask.id);
    const completed = { id: timerTask.id, title: timerTask.title };
    completeTask(completed.id);
    setIsRunning(false);
    // focusPromptEnabled が true のときだけ集中度モーダルを表示。
    // それ以外は従来どおり即 Home へ戻る。
    if (useAppStore.getState().focusPromptEnabled) {
      setFocusTarget(completed);
    } else {
      setTimerTask(null);
      navigation.navigate('Home');
    }
  }, [timerTask, completeTask, setTimerTask, navigation]);

  // 集中度モーダルを閉じた後（保存・スキップ共通）に Home へ戻る
  const handleFocusModalClose = useCallback(() => {
    setFocusTarget(null);
    setTimerTask(null);
    navigation.navigate('Home');
  }, [setTimerTask, navigation]);

  const handleAbort = useCallback(() => {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    cancelTimerEndNotification();
    setTimerTask(null);
    setIsRunning(false);
    setSeconds(timerWorkMinutes * 60);
    setMode('work');
    navigation.navigate('Home');
  }, [setTimerTask, navigation, timerWorkMinutes]);

  const handleSkip = useCallback(() => {
    if (!timerTask) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    cancelTimerEndNotification();
    skipTask(timerTask.id);
    setTimerTask(null);
    setIsRunning(false);
    navigation.navigate('Home');
  }, [timerTask, skipTask, setTimerTask, navigation]);

  const totalSec = mode === 'work' ? workSec : breakSec;
  const progress = 1 - seconds / totalSec;
  const ringColor = mode === 'work' ? colors.primary : colors.success;
  const modeLabel = mode === 'work' ? 'フォーカス' : 'ブレイク';

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRule} />
        <View style={styles.headerContent}>
          <Text style={styles.modeTag}>{modeLabel}</Text>
        </View>
        {timerTask && (
          <Text style={styles.taskName} numberOfLines={2}>{timerTask.title}</Text>
        )}
        <View style={styles.headerRule} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* プリセット選択行 */}
        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const isActive = timerWorkMinutes === p.work && customInput === '';
            return (
              <Pressable
                key={p.label}
                style={({ pressed }) => [styles.presetChip, isActive && styles.presetChipActive, pressed && { opacity: 0.7 }]}
                onPress={() => applyPreset(p.work)}
              >
                <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 選択中プリセットの内訳 */}
        {customInput === '' && (
          <Text style={styles.presetDetail}>
            作業 {timerWorkMinutes}分 + 休憩 {getBreakMinutes(timerWorkMinutes)}分
          </Text>
        )}

        {/* カスタム設定エリア */}
        <View style={styles.customArea}>
          <Text style={styles.customAreaLabel}>カスタム（作業時間）</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={[styles.customInputField, customInput !== '' && styles.customInputFieldActive]}
              value={customInput}
              onChangeText={(v) => {
                const n = v.replace(/[^0-9]/g, '');
                setCustomInput(n);
              }}
              onEndEditing={(e) => {
                const n = parseInt(e.nativeEvent.text, 10);
                if (!isNaN(n) && n >= 1 && n <= 180) {
                  applyPreset(n);
                } else {
                  setCustomInput('');
                }
              }}
              keyboardType="number-pad"
              placeholder="分を入力"
              placeholderTextColor={colors.textDisabled}
              maxLength={3}
              returnKeyType="done"
            />
            {customInput !== '' && (
              <Text style={styles.customBreakHint}>
                ↳ 休憩 {getBreakMinutes(parseInt(customInput, 10))}分（自動）
              </Text>
            )}
          </View>
        </View>

        {/* Ring + start/pause */}
        <View style={styles.ringRow}>
          <View style={styles.ring}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={colors.surfaceAlt}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={ringColor}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                strokeLinecap="round"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.ringInner}>
              <TimerDisplay seconds={seconds} isRunning={isRunning} color={isRunning ? ringColor : colors.ink} />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.7 }]}
            onPress={handleStartPause}
            accessibilityRole="button"
            accessibilityLabel={isRunning ? '一時停止' : 'スタート'}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={26}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: ringColor }]} />
        </View>

        {/* Task actions */}
        {timerTask && (
          <View style={styles.taskActions}>
            <Pressable
              style={({ pressed }) => [styles.completeBtn, pressed && { backgroundColor: colors.primaryDark }]}
              onPress={handleComplete}
            >
              <Text style={styles.completeBtnText}>タスク完了！</Text>
            </Pressable>
            <View style={styles.subActions}>
              <Pressable
                style={({ pressed }) => [styles.subBtn, styles.abortBtn, pressed && { opacity: 0.6 }]}
                onPress={handleAbort}
              >
                <Text style={[styles.subBtnText, styles.abortBtnText]}>中断</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.subBtn, styles.skipBtn, pressed && { opacity: 0.6 }]}
                onPress={handleSkip}
              >
                <Text style={[styles.subBtnText, styles.skipBtnText]}>後に回す</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* タスク完了後の集中度プロンプト */}
      <FocusModal
        visible={focusTarget != null}
        taskId={focusTarget?.id ?? ''}
        taskTitle={focusTarget?.title ?? ''}
        onClose={handleFocusModalClose}
      />
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
  headerRule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
  },
  modeTag: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
    letterSpacing: 0.5,
  },
  presetChipTextActive: {
    color: colors.primary,
  },
  presetDetail: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginTop: -spacing.sm,
  },
  customArea: {
    width: '100%',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customAreaLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  customInputRow: {
    gap: spacing.xs,
  },
  customInputField: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customInputFieldActive: {
    borderColor: colors.primary,
    color: colors.primary,
  },
  customBreakHint: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    letterSpacing: 0.3,
    paddingLeft: spacing.xs,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  controls: {
    paddingBottom: spacing.lg,
  },
  startBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  taskActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  completeBtn: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  completeBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.surface,
    letterSpacing: 1,
  },
  subActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  subBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  subBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  abortBtn: {
    borderColor: colors.danger,
    backgroundColor: '#F6E4E4',
  },
  abortBtnText: {
    color: colors.danger,
  },
  skipBtn: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  skipBtnText: {
    color: colors.textSub,
  },
  taskName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.ink,
    paddingVertical: spacing.xs,
    letterSpacing: -0.3,
  },
});
