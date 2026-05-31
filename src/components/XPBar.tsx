import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { BADGE_THRESHOLDS } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

interface Props {
  xp: number;
}

export function XPBar({ xp }: Props) {
  const badgeCount = BADGE_THRESHOLDS.filter((t) => xp >= t).length;
  const isMaxed = badgeCount >= BADGE_THRESHOLDS.length;
  const prevThreshold = badgeCount > 0 ? BADGE_THRESHOLDS[badgeCount - 1] : 0;
  const nextThreshold = isMaxed ? BADGE_THRESHOLDS[BADGE_THRESHOLDS.length - 1] : BADGE_THRESHOLDS[badgeCount];
  const progress = isMaxed ? 1 : (xp - prevThreshold) / (nextThreshold - prevThreshold);
  const remaining = nextThreshold - xp;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>XP {xp}</Text>
        <Text style={styles.hint}>
          {isMaxed ? '全バッジ獲得' : `次のバッジまで — ${remaining} XP`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` as any }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
});
