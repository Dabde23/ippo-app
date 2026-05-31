import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Badge } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

interface Props {
  badge: Badge;
  onDismiss: () => void;
}

export function BadgeModal({ badge, onDismiss }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Modal transparent animationType="none" visible>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <Text style={styles.congrats}>🎉 バッジ獲得！</Text>
          <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.message}>XPをどんどん貯めよう！</Text>
          <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.btnText}>やった！</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '80%',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  congrats: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSub,
    letterSpacing: 0.3,
  },
  badgeEmoji: {
    fontSize: 72,
  },
  badgeName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
});
