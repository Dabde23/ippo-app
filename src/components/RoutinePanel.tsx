import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView,
  Alert, Platform, Animated, useWindowDimensions,
} from 'react-native';
import { Text } from './Text';
import { useAppStore, Task } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

const PANEL_RATIO = 0.85;
const IS_WEB = Platform.OS === 'web';

interface RoutinePanelProps {
  onClose: () => void;
}

export function RoutinePanel({ onClose }: RoutinePanelProps) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.round(width * PANEL_RATIO);

  const tasks = useAppStore((s) => s.tasks);
  const routines = tasks.filter((t) => t.isRoutine === true);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);

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

  function handleDelete(task: Task) {
    if (Platform.OS === 'web') {
      if (window.confirm(`ルーティン「${task.title}」を削除しますか？`)) deleteRoutine(task.id);
      return;
    }
    Alert.alert('ルーティンを削除', `「${task.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deleteRoutine(task.id) },
    ]);
  }

  const panelContent = (
    <>
      <View style={styles.header}>
        <View style={styles.rule} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>ルーティン管理</Text>
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
        {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔁</Text>
            <Text style={styles.emptyTitle}>ルーティンがありません</Text>
            <Text style={styles.emptyHint}>
              タスク追加時に「毎日繰り返す」をオンにすると、{'\n'}毎日そのタスクが自動で表示されます。
            </Text>
          </View>
        ) : (
          routines.map((task) => (
            <View key={task.id} style={styles.row}>
              <View style={styles.accentBar} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={2}>{task.title}</Text>
                <Text style={styles.rowDate}>登録日 {task.routineCreatedAt}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleDelete(task)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteText}>削除</Text>
              </Pressable>
            </View>
          ))
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );

  // Web: Animated.View causes infinite re-render loop (RN Web setState issue),
  // so use plain Views with position:fixed to cover the full viewport.
  if (IS_WEB) {
    return (
      <View style={styles.rootFixed}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.overlayWeb]}
          onPress={handleClose}
        />
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  rootFixed: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26,16,7,0.45)',
  },
  overlayWeb: {
    backgroundColor: 'rgba(26,16,7,0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  closeBtn: { paddingVertical: spacing.xs },
  closeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: 0,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    lineHeight: 21,
  },
  rowDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  deleteText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
    textAlign: 'center',
  },
});
