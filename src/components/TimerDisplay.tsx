import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../theme';

interface Props {
  seconds: number;
  isRunning: boolean;
  color?: string;
}

export function TimerDisplay({ seconds, isRunning, color }: Props) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const timeColor = color ?? (isRunning ? colors.primary : colors.textMain);

  return (
    <View style={styles.container}>
      <Text style={[styles.time, { color: timeColor }]}>
        {mins}:{secs}
      </Text>
      {seconds === 0 && <Text style={styles.done}>完了！</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  time: {
    fontSize: 64,
    fontWeight: fontWeight.bold,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  done: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
  },
});
