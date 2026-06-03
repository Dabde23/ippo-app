import React from 'react';
import {
  View, StyleSheet, Pressable, ScrollView,
  SafeAreaView, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/Text';
import { useAppStore, Task } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

export function RoutineScreen() {
  const navigation = useNavigation<any>();
  const routines = useAppStore((s) => s.tasks.filter((t) => t.isRoutine));
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);

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

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.rule} />
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backText}>← 戻る</Text>
          </Pressable>
          <Text style={styles.title}>ルーティン管理</Text>
        </View>
        <View style={styles.rule} />
      </View>

      {/* ── CONTENT ── */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  backBtn: {
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
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
  rowBody: {
    flex: 1,
    gap: 2,
  },
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
  emptyIcon: {
    fontSize: 40,
  },
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
