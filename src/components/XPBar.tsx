import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BADGE_THRESHOLDS } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

interface Props {
  xp: number;
  variant?: 'default' | 'header';
}

export function XPBar({ xp, variant = 'default' }: Props) {
  const badgeCount = BADGE_THRESHOLDS.filter((t) => xp >= t).length;
  const isMaxed = badgeCount >= BADGE_THRESHOLDS.length;
  const prevThreshold = badgeCount > 0 ? BADGE_THRESHOLDS[badgeCount - 1] : 0;
  const nextThreshold = isMaxed ? BADGE_THRESHOLDS[BADGE_THRESHOLDS.length - 1] : BADGE_THRESHOLDS[badgeCount];
  const progress = isMaxed ? 1 : (xp - prevThreshold) / (nextThreshold - prevThreshold);
  const remaining = nextThreshold - xp;

  const isHeader = variant === 'header';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.xpText, isHeader && styles.xpTextHeader]}>
          ⚡ {xp} XP
        </Text>
        <Text style={[styles.hint, isHeader && styles.hintHeader]}>
          {isMaxed ? '全バッジ獲得！' : `あと ${remaining} XP でバッジ`}
        </Text>
      </View>
      <View style={[styles.track, isHeader && styles.trackHeader]}>
        <View
          style={[
            styles.fill,
            isHeader && styles.fillHeader,
            { width: `${progress * 100}%` as any },
          ]}
        />
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
  xpText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.xpGold,
  },
  xpTextHeader: {
    color: colors.headerText,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  hintHeader: {
    color: colors.headerTextSub,
  },
  track: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  trackHeader: {
    backgroundColor: colors.headerTrack,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.xpGold,
    borderRadius: radius.full,
  },
  fillHeader: {
    backgroundColor: colors.headerFill,
  },
});
