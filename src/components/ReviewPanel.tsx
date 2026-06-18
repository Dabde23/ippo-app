import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView,
  Platform, Animated, useWindowDimensions,
} from 'react-native';
import { Text } from './Text';
import { TrackingPanel } from './TrackingPanel';
import { colors, spacing } from '../theme';

const PANEL_RATIO = 0.85;
const IS_WEB = Platform.OS === 'web';

interface Props {
  onClose: () => void;
}

// 振り返りページ（独立）。
// 気分カレンダー＋気分/集中度グラフ（= TrackingPanel）を RoutinePanel/TaskListPanel と同じ
// オーバーレイ（右からスライドインのフルハイト）として独立させる。全ユーザーに常時表示。
export function ReviewPanel({ onClose }: Props) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.round(width * PANEL_RATIO);

  const translateX = useRef(new Animated.Value(IS_WEB ? 0 : panelWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(IS_WEB ? 1 : 0)).current;

  useEffect(() => {
    if (IS_WEB) return;
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleClose() {
    if (IS_WEB) { onClose(); return; }
    Animated.parallel([
      Animated.timing(translateX, { toValue: panelWidth, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  const panelContent = (
    <>
      <View style={styles.header}>
        <View style={styles.rule} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>振り返り</Text>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeText}>閉じる ✕</Text>
          </Pressable>
        </View>
        <View style={styles.rule} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TrackingPanel />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );

  // Web: Animated.View が無限再レンダーを起こすため position:fixed の素の View に分岐（既存パネル踏襲）。
  if (IS_WEB) {
    return (
      <View style={styles.rootFixed}>
        <Pressable style={[StyleSheet.absoluteFill, styles.overlayWeb]} onPress={handleClose} />
        <View style={[styles.panel, { width: panelWidth }]}>
          {panelContent}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>
      <Animated.View style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
        {panelContent}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  rootFixed: {
    position: 'fixed' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(26,16,7,0.45)',
  },
  overlayWeb: {
    backgroundColor: 'rgba(26,16,7,0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    backgroundColor: colors.background,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.ink,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  rule: { height: 1, backgroundColor: colors.ink },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  closeBtn: { paddingVertical: spacing.xs },
  closeText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
});
