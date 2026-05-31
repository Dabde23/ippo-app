import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../theme';

interface Props {
  seconds: number;
  isRunning: boolean;
}

export function TimerDisplay({ seconds, isRunning }: Props) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={[styles.time, isRunning && styles.timeActive]}>
        {mins}:{secs}
      </Text>
      {seconds === 0 && <Text style={styles.done}>✅ 完了！</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  time: {
    fontSize: 72,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  timeActive: {
    color: colors.primary,
  },
  done: {
    fontSize: fontSize.lg,
    color: colors.success,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
  },
});
