import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { Text } from '../components/Text';
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
  function switchMode(m: 'work' | 'break') {
    setIsRunning(false); setMode(m);
    setSeconds(m === 'work' ? WORK_DURATION : SHORT_BREAK);
  }

  const progress = 1 - seconds / (mode === 'work' ? WORK_DURATION : SHORT_BREAK);
  const ringColor = mode === 'work' ? colors.primary : colors.success;
  const modeLabel = mode === 'work' ? 'フォーカス' : 'ブレイク';

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRule} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>タイマー</Text>
          <Text style={styles.modeTag}>{modeLabel}</Text>
        </View>
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

        {/* Ring */}
        <View style={styles.ringContainer}>
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
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: ringColor }]} />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.6 }]}
            onPress={handleReset}
          >
            <Text style={styles.resetBtnText}>リセット</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.startBtn, { backgroundColor: ringColor }, pressed && { opacity: 0.85 }]}
            onPress={handleStartPause}
            disabled={seconds === 0}
          >
            <Text style={styles.startBtnText}>
              {seconds === 0 ? '完了' : isRunning ? '一時停止' : 'スタート'}
            </Text>
          </Pressable>
        </View>

        {/* Tip */}
        <View style={styles.tipBlock}>
          <Text style={styles.tipLabel}>使い方</Text>
          <View style={styles.headerRule} />
          <Text style={styles.tipTitle}>ポモドーロテクニック</Text>
          <Text style={styles.tipText}>25分集中 → 5分休憩を繰り返すと集中力を長く保てます</Text>
        </View>
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
    color: colors.textMuted,
    letterSpacing: 2,
  },
  modeBtnTime: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: -0.5,
  },
  modeBtnLabelActive: {
    color: colors.primary,
  },
  modeBtnLabelBreak: {
    color: colors.success,
  },
  ringContainer: {},
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
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  resetBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  resetBtnText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    fontWeight: fontWeight.black,
    letterSpacing: 2,
  },
  startBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  startBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: colors.surface,
    letterSpacing: 2.5,
  },
  tipBlock: {
    width: '100%',
    gap: spacing.sm,
  },
  tipLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  tipTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
  },
});
