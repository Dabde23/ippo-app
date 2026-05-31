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
    backgroundColor: 'rgba(26,16,7,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '82%',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  congrats: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  badgeEmoji: {
    fontSize: 64,
  },
  badgeName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    letterSpacing: 0.3,
  },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.surface,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
