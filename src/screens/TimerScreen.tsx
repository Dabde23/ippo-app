import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/Text';
import { TimerDisplay } from '../components/TimerDisplay';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { useAppStore } from '../store/useAppStore';

const WORK_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;

export function TimerScreen() {
  const [seconds, setSeconds] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autostartRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { timerTaskId, tasks, completeTask, skipTask, setTimerTask } = useAppStore();
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
              setSeconds(next === 'work' ? WORK_DURATION : SHORT_BREAK);
              autostartRef.current = setTimeout(() => setIsRunning(true), 2000);
              return next;
            });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  useEffect(() => {
    return () => { if (autostartRef.current) clearTimeout(autostartRef.current); };
  }, []);

  useEffect(() => {
    if (!timerTaskId) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    setIsRunning(false);
    setSeconds(WORK_DURATION);
    setMode('work');
    autostartRef.current = setTimeout(() => setIsRunning(true), 1000);
    return () => { if (autostartRef.current) clearTimeout(autostartRef.current); };
  }, [timerTaskId]);

  function handleStartPause() { setIsRunning((r) => !r); }
  function switchMode(m: 'work' | 'break') {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    setIsRunning(false); setMode(m);
    setSeconds(m === 'work' ? WORK_DURATION : SHORT_BREAK);
  }

  const handleComplete = useCallback(() => {
    if (!timerTask) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    completeTask(timerTask.id);
    setTimerTask(null);
    setIsRunning(false);
    navigation.navigate('Home');
  }, [timerTask, completeTask, setTimerTask, navigation]);

  const handleAbort = useCallback(() => {
    if (autostartRef.current) clearTimeout(autostartRef.current);
    setTimerTask(null);
    setIsRunning(false);
    setSeconds(WORK_DURATION);
    setMode('work');
    navigation.navigate('Home');
  }, [setTimerTask, navigation]);

  const handleSkip = useCallback(() => {
    if (!timerTask) return;
    if (autostartRef.current) clearTimeout(autostartRef.current);
    skipTask(timerTask.id);
    setTimerTask(null);
    setIsRunning(false);
    navigation.navigate('Home');
  }, [timerTask, skipTask, setTimerTask, navigation]);

  const progress = 1 - seconds / (mode === 'work' ? WORK_DURATION : SHORT_BREAK);
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
        {/* Mode selector */}
        <View style={styles.modeRow}>
          <Pressable
            style={({ pressed }) => [styles.modeBtn, mode === 'work' && styles.modeBtnActive, pressed && { opacity: 0.7 }]}
            onPress={() => switchMode('work')}
          >
            <Text style={[styles.modeBtnLabel, mode === 'work' && styles.modeBtnLabelActive]}>フォーカス</Text>
            <Text style={[styles.modeBtnTime, mode === 'work' && styles.modeBtnLabelActive]}>25:00</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.modeBtn, mode === 'break' && styles.modeBtnBreak, pressed && { opacity: 0.7 }]}
            onPress={() => switchMode('break')}
          >
            <Text style={[styles.modeBtnLabel, mode === 'break' && styles.modeBtnLabelBreak]}>ブレイク</Text>
            <Text style={[styles.modeBtnTime, mode === 'break' && styles.modeBtnLabelBreak]}>05:00</Text>
          </Pressable>
        </View>

        {/* Ring + start/pause */}
        <View style={styles.ringRow}>
          <View
            style={[
              styles.ring,
              {
                backgroundImage: `conic-gradient(${ringColor} ${Math.round(progress * 360)}deg, ${colors.surfaceAlt} 0deg)`,
              } as object,
            ]}
          >
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
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 2,
  },
  modeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeBtnBreak: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  modeBtnLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
    letterSpacing: 2,
  },
  modeBtnTime: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.textSub,
    letterSpacing: -0.5,
  },
  modeBtnLabelActive: {
    color: colors.primary,
  },
  modeBtnLabelBreak: {
    color: colors.success,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
  },
  ring: {
    width: 240,
    height: 240,
    borderRadius: 120,
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
