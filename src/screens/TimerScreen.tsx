import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Text } from '../components/Text';
import { TimerDisplay } from '../components/TimerDisplay';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
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

// Semicircle arc constants
const SEMI_W = 300;
const SEMI_R = 120;
const SEMI_CX = SEMI_W / 2; // 150
const SEMI_CY = SEMI_R + 20; // 140
const SEMI_H = SEMI_CY + 20; // 160
const SEMI_STROKE = 14;
const SEMI_PATH_LEN = Math.PI * SEMI_R; // ≈ 376.99

// Track path: from left (30, 140) clockwise through top (150, 20) to right (270, 140)
// sweep-flag=1 = clockwise in SVG (y-down) = visually goes UP through the top half
const SEMI_TRACK = `M ${SEMI_CX - SEMI_R},${SEMI_CY} A ${SEMI_R},${SEMI_R} 0 0,1 ${SEMI_CX + SEMI_R},${SEMI_CY}`;

export function TimerScreen() {
  const { timerTaskId, tasks, completeTask, setTimerTask, timerWorkMinutes, setTimerWorkMinutes } = useAppStore();

  const [seconds, setSeconds] = useState(timerWorkMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autostartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseEndTimeRef = useRef<number | null>(null);

  const workSec = timerWorkMinutes * 60;
  const breakSec = getBreakMinutes(timerWorkMinutes) * 60;
  const totalSec = mode === 'work' ? workSec : breakSec;

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
    return () => {
      if (autostartRef.current) clearTimeout(autostartRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active' || !isRunning || phaseEndTimeRef.current === null) return;
      const now = Date.now();
      let endTime = phaseEndTimeRef.current;
      let currentMode = mode;
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
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    cancelTimerEndNotification();
    setIsRunning(false);
    setSeconds(timerWorkMinutes * 60);
    setMode('work');
    phaseEndTimeRef.current = null;

    // Start countdown display
    setCountdown(2);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    autostartRef.current = setTimeout(() => {
      phaseEndTimeRef.current = Date.now() + timerWorkMinutes * 60 * 1000;
      setIsRunning(true);
      setCountdown(null);
      scheduleTimerEndNotification(timerWorkMinutes * 60, 'ブレイクの時間です');
    }, 2000);
    return () => {
      if (autostartRef.current) clearTimeout(autostartRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [timerTaskId]);

  function handleStartPause() {
    // Cancel pending autostart/countdown if any
    if (autostartRef.current) {
      clearTimeout(autostartRef.current);
      autostartRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);

    const newRunning = !isRunning;
    if (newRunning) {
      phaseEndTimeRef.current = Date.now() + seconds * 1000;
      const body = mode === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
      scheduleTimerEndNotification(seconds, body);
    }
    setIsRunning(newRunning);
  }

  function handleReset() {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    cancelTimerEndNotification();
    setIsRunning(false);
    setSeconds(workSec);
    setMode('work');
    setCountdown(null);
    phaseEndTimeRef.current = null;
  }

  function applyPreset(workMin: number) {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    cancelTimerEndNotification();
    setTimerWorkMinutes(workMin);
    setCustomInput('');
    setShowCustomInput(false);
    setMode('work');
    const sec = workMin * 60;
    setSeconds(sec);
    setIsRunning(false);
    phaseEndTimeRef.current = null;

    // Start countdown display
    setCountdown(2);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    autostartRef.current = setTimeout(() => {
      phaseEndTimeRef.current = Date.now() + sec * 1000;
      setIsRunning(true);
      setCountdown(null);
      scheduleTimerEndNotification(sec, 'ブレイクの時間です');
    }, 2000);
  }

  const handleComplete = useCallback(() => {
    if (!timerTask) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    cancelTimerEndNotification();
    if (timerTask.taskReminderTime) cancelTaskReminder(timerTask.id);
    completeTask(timerTask.id);
    setIsRunning(false);
    setCountdown(null);
    setTimerTask(null);
    navigation.navigate('Home');
  }, [timerTask, completeTask, setTimerTask, navigation]);

  const handleAbort = useCallback(() => {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    cancelTimerEndNotification();
    setTimerTask(null);
    setIsRunning(false);
    setSeconds(timerWorkMinutes * 60);
    setMode('work');
    setCountdown(null);
    navigation.navigate('Home');
  }, [setTimerTask, navigation, timerWorkMinutes]);

  const ringColor = mode === 'work' ? colors.primary : colors.success;
  const modeLabel = mode === 'work' ? 'フォーカス' : 'ブレイク';

  // Arc shows ELAPSED time: grows from left→top→right as time passes
  // ratio = remaining fraction (1 at start → 0 at end)
  const ratio = seconds / totalSec;
  // dashOffset=L when ratio=1 (no arc yet), 0 when ratio=0 (full arc)
  const dashOffset = SEMI_PATH_LEN * ratio;

  // Dot at leading edge (moves left→top→right as elapsed time grows)
  // ratio=1 (start): dotAngle=π → left; ratio=0.5: π/2 → top; ratio=0: 0 → right
  const dotAngle = ratio * Math.PI;
  const dotX = SEMI_CX + SEMI_R * Math.cos(dotAngle);
  const dotY = SEMI_CY - SEMI_R * Math.sin(dotAngle);

  return (
    <SafeAreaView style={styles.safe}>
      {!isRunning && (
        <View style={styles.header}>
          <View style={styles.headerRule} />
          <View style={styles.headerContent}>
            <Text style={styles.modeTag}>{modeLabel}</Text>
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="person-outline" size={24} color={colors.ink} />
            </Pressable>
          </View>
          {timerTask && (
            <Text style={styles.taskName} numberOfLines={2}>{timerTask.title}</Text>
          )}
          <View style={styles.headerRule} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isRunning && (
          <>
            <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const isActive = timerWorkMinutes === p.work && !showCustomInput;
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
          <Pressable
            style={({ pressed }) => [styles.presetChip, showCustomInput && styles.presetChipActive, pressed && { opacity: 0.7 }]}
            onPress={() => setShowCustomInput((v) => !v)}
          >
            <Text style={[styles.presetChipText, showCustomInput && styles.presetChipTextActive]}>カスタム</Text>
          </Pressable>
        </View>

        {showCustomInput ? (
          <View style={styles.customArea}>
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
              placeholder="作業時間（分）を入力"
              placeholderTextColor={colors.textDisabled}
              maxLength={3}
              returnKeyType="done"
              autoFocus
            />
            {customInput !== '' && (
              <Text style={styles.customBreakHint}>
                ↳ 休憩 {getBreakMinutes(parseInt(customInput, 10))}分（自動）
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.presetDetail}>
            作業 {timerWorkMinutes}分 + 休憩 {getBreakMinutes(timerWorkMinutes)}分
          </Text>
        )}
          </>
        )}

        {/* Semicircle arc */}
        <View style={styles.arcContainer}>
          <Svg width={SEMI_W} height={SEMI_H}>
            {/* Track (background arc) */}
            <Path
              d={SEMI_TRACK}
              stroke={colors.surfaceAlt}
              strokeWidth={SEMI_STROKE}
              fill="none"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <Path
              d={SEMI_TRACK}
              stroke={ringColor}
              strokeWidth={SEMI_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={SEMI_PATH_LEN}
              strokeDashoffset={dashOffset}
            />
            {/* Dot marker at end of visible arc */}
            <SvgCircle
              cx={dotX}
              cy={dotY}
              r={9}
              fill={ringColor}
            />
          </Svg>
        </View>

        {/* Time display */}
        <View style={styles.timeRow}>
          <TimerDisplay seconds={seconds} isRunning={isRunning} color={isRunning ? ringColor : colors.ink} />
        </View>

        {/* Countdown announcement */}
        {countdown !== null && !isRunning && (
          <Text style={styles.countdown}>{countdown}秒後にタイマースタート</Text>
        )}

        {/* Play/Pause button */}
        <Pressable
          style={({ pressed }) => [styles.mainBtn, pressed && { opacity: 0.8 }]}
          onPress={handleStartPause}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? '一時停止' : 'スタート'}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={30}
            color={colors.primary}
          />
        </Pressable>

        {/* Task actions — kept exactly as-is */}
        {timerTask && (
          <View style={styles.taskActions}>
            <Pressable
              style={({ pressed }) => [styles.completeBtn, pressed && { backgroundColor: colors.primaryDark }]}
              onPress={handleComplete}
            >
              <Text style={styles.completeBtnText}>タスク完了！</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.abortOnlyBtn, pressed && { opacity: 0.6 }]}
              onPress={handleAbort}
            >
              <Text style={styles.abortOnlyBtnText}>中断</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  headerRule: { height: 1, backgroundColor: colors.ink },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: spacing.xs },
  title: { fontSize: fontSize.xxxl, fontWeight: fontWeight.black, color: colors.ink, letterSpacing: -2, lineHeight: 46 },
  modeTag: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 3, textTransform: 'uppercase' },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: spacing.xl, alignItems: 'center', paddingBottom: spacing.xxl },
  presetRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  presetChip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, minHeight: 52 },
  presetChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  presetChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSub, letterSpacing: 0.5 },
  presetChipTextActive: { color: colors.primary },
  presetDetail: { fontSize: fontSize.xs, color: colors.textSub, letterSpacing: 0.5, alignSelf: 'flex-start', marginTop: -spacing.sm },
  customArea: { width: '100%', gap: spacing.xs },
  customInputField: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSub, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  customInputFieldActive: { borderColor: colors.primary, color: colors.primary },
  customBreakHint: { fontSize: fontSize.xs, color: colors.textSub, letterSpacing: 0.3, paddingLeft: spacing.xs },
  arcContainer: { alignItems: 'center', width: '100%' },
  timeRow: { alignItems: 'center', marginTop: -spacing.lg },
  countdown: { fontSize: fontSize.xs, color: colors.textSub, letterSpacing: 1, textAlign: 'center' },
  mainBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  taskActions: { width: '100%', gap: spacing.sm, marginTop: spacing.xs },
  completeBtn: { alignItems: 'center', paddingVertical: 24, borderRadius: radius.lg, backgroundColor: colors.primary },
  completeBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.surface, letterSpacing: 1 },
  abortOnlyBtn: { width: '100%', alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.danger, backgroundColor: '#F6E4E4', marginTop: spacing.xl },
  abortOnlyBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 1, color: colors.danger },
  taskName: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.ink, paddingVertical: spacing.xs, letterSpacing: -0.3 },
});
