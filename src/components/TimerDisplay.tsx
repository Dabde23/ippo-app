import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, fontSize, fontWeight, spacing } from '../theme';

interface Props {
  seconds: number;
  isRunning: boolean;
  color?: string;
}

export function TimerDisplay({ seconds, isRunning, color }: Props) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const timeColor = color ?? (isRunning ? colors.primary : colors.ink);

  return (
    <View style={styles.container}>
      <Text style={[styles.time, { color: timeColor }]}>{mins}:{secs}</Text>
      {seconds === 0 && <Text style={styles.done}>完了</Text>}
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
    fontWeight: fontWeight.black,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  done: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.bold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
});
