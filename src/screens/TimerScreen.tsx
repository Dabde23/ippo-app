import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '../components/Text';
import { TimerDisplay } from '../components/TimerDisplay';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { scheduleTimerEndNotification, cancelTimerEndNotification } from '../services/NotificationService';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autostartRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workSec = timerWorkMinutes * 60;
  const breakSec = getBreakMinutes(timerWorkMinutes) * 60;

  const navigation = useNavigation<any>();
  const timerTask = tasks.find((t) => t.id === timerTaskId) ?? null;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setIsRunning(false);
            setMode((m) => {
              const next = m === 'work' ? 'break' : 'work';
              const nextSec = next === 'work' ? workSec : breakSec;
              setSeconds(nextSec);
              // cancelTimerEndNotification がisRunning=false effectで走った後に
              // 次モードの通知をスケジュールするため、autostartRef内で行う
              autostartRef.current = setTimeout(() => {
                const endBody = next === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
                scheduleTimerEndNotification(nextSec, endBody);
                setIsRunning(true);
              }, 1000);
              return next;
            });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelTimerEndNotification();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, workSec, breakSec]);

  useEffect(() => {
    return () => { if (autostartRef.current) clearTimeout(autostartRef.current); };
  }, []);

  useEffect(() => {
    if (!timerTaskId) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    setIsRunning(false);
    setSeconds(timerWorkMinutes * 60);
    setMode('work');
    autostartRef.current = setTimeout(() => {
      setIsRunning(true);
      scheduleTimerEndNotification(timerWorkMinutes * 60, 'ブレイクの時間です');
    }, 1000);
    return () => { if (autostartRef.current) clearTimeout(autostartRef.current); };
  }, [timerTaskId]);

  function handleStartPause() {
    setIsRunning((r) => {
      if (!r) {
        const body = mode === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
        scheduleTimerEndNotification(seconds, body);
      }
      return !r;
    });
  }

  function applyPreset(workMin: number) {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    cancelTimerEndNotification();
    setTimerWorkMinutes(workMin);
    setCustomInput('');
    setMode('work');
    setSeconds(workMin * 60);
    setIsRunning(true);
    scheduleTimerEndNotification(workMin * 60, 'ブレイクの時間です');
  }

  const handleComplete = useCallback(() => {
    if (!timerTask) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    cancelTimerEndNotification();
    completeTask(timerTask.id);
    setTimerTask(null);
    setIsRunning(false);
    navigation.navigate('Home');
  }, [timerTask, completeTask, setTimerTask, navigation]);

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
          {/* カスタム入力欄 */}
          <View style={[styles.presetChip, styles.customChip, customInput !== '' && styles.presetChipActive]}>
            <TextInput
              style={[styles.customInput, customInput !== '' && styles.customInputActive]}
              value={customInput}
              onChangeText={(v) => {
                const n = v.replace(/[^0-9]/g, '');
                setCustomInput(n);
              }}
              onEndEditing={() => {
                const n = parseInt(customInput, 10);
                if (!isNaN(n) && n >= 1 && n <= 180) {
                  applyPreset(n);
                } else {
                  setCustomInput('');
                }
              }}
              keyboardType="number-pad"
              placeholder="分"
              placeholderTextColor={colors.textDisabled}
              maxLength={3}
              returnKeyType="done"
            />
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
  customChip: {
    paddingVertical: 0,
  },
  customInput: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
    textAlign: 'center',
    width: '100%',
    paddingVertical: spacing.md,
  },
  customInputActive: {
    color: colors.primary,
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
