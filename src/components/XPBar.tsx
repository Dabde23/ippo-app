import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const segmentXp = xp - prevThreshold;
  const segmentTotal = nextThreshold - prevThreshold;
  const progress = isMaxed ? 1 : segmentXp / segmentTotal;
  const remaining = segmentTotal - segmentXp;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.xpValue}>⚡ {xp} XP</Text>
        <Text style={styles.hint}>
          {isMaxed ? '全バッジ獲得！' : `次のバッジまで ${remaining} XP`}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.xpGold,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSub,
  },
  track: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.xpGold,
    borderRadius: radius.full,
  },
});
