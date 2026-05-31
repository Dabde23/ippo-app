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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>⚡ XP</Text>
        <Text style={styles.badgeLabel}>
          {isMaxed ? '🏆 全バッジ獲得！' : `次のバッジまで ${segmentTotal - segmentXp} XP`}
        </Text>
        <Text style={styles.xpText}>{xp} XP</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>バッジ {badgeCount} / {BADGE_THRESHOLDS.length}</Text>
        {!isMaxed && (
          <Text style={styles.footerText}>目標: {nextThreshold} XP</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  badgeLabel: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSub,
  },
  xpText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.xpGold,
  },
  track: {
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.xpGold,
    borderRadius: radius.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
  },
});
