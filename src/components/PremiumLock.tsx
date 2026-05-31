import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PREMIUM_PRICE_JPY } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

interface Props {
  featureName: string;
  onUpgrade?: () => void;
}

export function PremiumLock({ featureName, onUpgrade }: Props) {
  return (
    <View style={styles.overlay}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>{featureName}</Text>
      <Text style={styles.description}>プレミアムプランで利用できます</Text>
      <Text style={styles.price}>¥{PREMIUM_PRICE_JPY}/月</Text>
      {onUpgrade && (
        <TouchableOpacity style={styles.button} onPress={onUpgrade} activeOpacity={0.8}>
          <Text style={styles.buttonText}>アップグレード</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.xl,
    margin: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textAlign: 'center',
  },
  price: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  buttonText: {
    color: colors.surface,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
