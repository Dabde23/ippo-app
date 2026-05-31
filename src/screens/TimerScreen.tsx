import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { TimerDisplay } from '../components/TimerDisplay';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

const WORK_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;

export function TimerScreen() {
  const [seconds, setSeconds] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => { if (s <= 1) { setIsRunning(false); return 0; } return s - 1; });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  function handleStartPause() { if (seconds > 0) setIsRunning((r) => !r); }
  function handleReset() { setIsRunning(false); setSeconds(mode === 'work' ? WORK_DURATION : SHORT_BREAK); }
  function switchMode(m: 'work' | 'break') { setIsRunning(false); setMode(m); setSeconds(m === 'work' ? WORK_DURATION : SHORT_BREAK); }

  const progress = 1 - seconds / (mode === 'work' ? WORK_DURATION : SHORT_BREAK);
  const ringColor = mode === 'work' ? colors.primary : colors.success;
  const headerBg = mode === 'work' ? colors.primary : colors.success;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: headerBg }]}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.title}>集中タイマー</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={({ pressed }) => [styles.modeBtn, mode === 'work' && styles.modeBtnActive, pressed && styles.modeBtnPressed]}
            onPress={() => switchMode('work')}
          >
            <Text style={[styles.modeBtnText, mode === 'work' && styles.modeBtnTextActive]}>🎯 集中</Text>
            <Text style={[styles.modeBtnSub, mode === 'work' && styles.modeBtnTextActive]}>25分</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.modeBtn, mode === 'break' && styles.modeBtnActive, pressed && styles.modeBtnPressed]}
            onPress={() => switchMode('break')}
          >
            <Text style={[styles.modeBtnText, mode === 'break' && styles.modeBtnTextActive]}>☕ 休憩</Text>
            <Text style={[styles.modeBtnSub, mode === 'break' && styles.modeBtnTextActive]}>5分</Text>
          </Pressable>
        </View>
      </View>

      {/* ── CONTENT ── */}
      <View style={styles.content}>
        {/* Progress ring */}
        <View style={styles.ringContainer}>
          <View
            style={[
              styles.ring,
              {
                backgroundImage: `conic-gradient(${ringColor} ${Math.round(progress * 360)}deg, ${colors.border} 0deg)`,
              } as object,
            ]}
          >
            <View style={styles.ringInner}>
              <TimerDisplay seconds={seconds} isRunning={isRunning} color={isRunning ? ringColor : colors.textMain} />
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: ringColor }]} />
        </View>
        <Text style={styles.progressLabel}>{Math.round(progress * 100)}% 完了</Text>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
            onPress={handleReset}
          >
            <Text style={styles.resetBtnText}>リセット</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: ringColor },
              seconds === 0 && styles.startBtnDone,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleStartPause}
            disabled={seconds === 0}
          >
            <Text style={styles.startBtnText}>
              {seconds === 0 ? '完了！' : isRunning ? '一時停止' : 'スタート'}
            </Text>
          </Pressable>
        </View>

        {/* Tip */}
        <View style={[styles.tipCard, { borderLeftColor: ringColor }]}>
          <Text style={[styles.tipTitle, { color: ringColor }]}>ポモドーロテクニック</Text>
          <Text style={styles.tipText}>25分集中 → 5分休憩を繰り返すと集中力を長く保てます</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.headerText,
    letterSpacing: -0.3,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    gap: 2,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  modeBtnPressed: {
    opacity: 0.8,
  },
  modeBtnText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: fontWeight.semibold,
  },
  modeBtnSub: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.65)',
  },
  modeBtnTextActive: {
    color: colors.textMain,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  ringContainer: {
    marginBottom: spacing.lg,
  },
  ring: {
    width: 236,
    height: 236,
    borderRadius: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 206,
    height: 206,
    borderRadius: 103,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    width: '100%',
    height: 5,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.lg,
  },
  resetBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetBtnText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  startBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    ...shadow.soft,
  },
  startBtnDone: {
    backgroundColor: colors.success,
  },
  startBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  tipCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  tipTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
  },
});
