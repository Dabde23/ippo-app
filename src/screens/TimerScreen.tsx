import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
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
        setSeconds((s) => {
          if (s <= 1) {
            setIsRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  function handleStartPause() {
    if (seconds === 0) return;
    setIsRunning((r) => !r);
  }

  function handleReset() {
    setIsRunning(false);
    setSeconds(mode === 'work' ? WORK_DURATION : SHORT_BREAK);
  }

  function switchMode(newMode: 'work' | 'break') {
    setIsRunning(false);
    setMode(newMode);
    setSeconds(newMode === 'work' ? WORK_DURATION : SHORT_BREAK);
  }

  const progress = 1 - seconds / (mode === 'work' ? WORK_DURATION : SHORT_BREAK);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>集中タイマー</Text>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'work' && styles.modeBtnActive]}
            onPress={() => switchMode('work')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, mode === 'work' && styles.modeBtnTextActive]}>
              集中  25分
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'break' && styles.modeBtnActive]}
            onPress={() => switchMode('break')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, mode === 'break' && styles.modeBtnTextActive]}>
              休憩  5分
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress ring */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressRing,
              {
                backgroundImage: `conic-gradient(${
                  isRunning ? colors.primary : progress > 0 ? colors.primary : colors.border
                } ${Math.round(progress * 360)}deg, ${colors.border} 0deg)`,
              } as object,
            ]}
          >
            <View style={styles.progressRingInner}>
              <TimerDisplay seconds={seconds} isRunning={isRunning} />
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{Math.round(progress * 100)}% 完了</Text>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
            <Text style={styles.resetBtnText}>リセット</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainBtn, seconds === 0 && styles.mainBtnDone]}
            onPress={handleStartPause}
            activeOpacity={0.85}
            disabled={seconds === 0}
          >
            <Text style={styles.mainBtnText}>
              {seconds === 0 ? '完了！' : isRunning ? '一時停止' : 'スタート'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>ポモドーロテクニック</Text>
          <Text style={styles.tipText}>
            25分集中 → 5分休憩を繰り返すと、集中力を長く保てます
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.2,
  },
  modeBtnTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingInner: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    marginBottom: spacing.xl,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.xl,
  },
  resetBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetBtnText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  mainBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  mainBtnDone: {
    backgroundColor: colors.success,
  },
  mainBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  tipCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
  },
});
