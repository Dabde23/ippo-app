import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, TextInput,
  Alert, Platform, Animated, useWindowDimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { TaskCard } from './TaskCard';
import { useAppStore, Task, today } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

const PANEL_RATIO = 0.85;
const IS_WEB = Platform.OS === 'web';

interface Props {
  onClose: () => void;
}

export function TaskListPanel({ onClose }: Props) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.round(width * PANEL_RATIO);

  const tasks = useAppStore((s) => s.tasks);
  const todayStr = today();
  const doableTasks = tasks.filter((t) => t.isRoutine !== true);
  const availableTasks = doableTasks.filter((t) => !t.completed && t.skippedDate !== todayStr);
  const skippedTasks = doableTasks.filter((t) => !t.completed && t.skippedDate === todayStr);
  const completedTasks = doableTasks.filter((t) => t.completed);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');

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

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditTitle(task.title);
  }

  function handleEditSave() {
    if (!editingTask || !editTitle.trim()) return;
    useAppStore.getState().editTask(editingTask.id, editTitle.trim());
    setEditingTask(null);
    setEditTitle('');
  }

  const panelContent = (
    <>
      <View style={styles.header}>
        <View style={styles.rule} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>タスク一覧</Text>
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
        {doableTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>タスクがありません</Text>
            <Text style={styles.emptyHint}>ホーム画面から追加できます</Text>
          </View>
        ) : (
          <>
            {availableTasks.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>残り {availableTasks.length} 件</Text>
                {availableTasks.map((t) => (
                  <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />
                ))}
              </>
            )}
            {skippedTasks.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>今日あとで {skippedTasks.length} 件</Text>
                {skippedTasks.map((t) => (
                  <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />
                ))}
              </>
            )}
            {completedTasks.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>完了 {completedTasks.length} 件</Text>
                {completedTasks.map((t) => (
                  <TaskCard key={t.id} task={t} onEdit={() => openEdit(t)} />
                ))}
              </>
            )}
          </>
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* 編集モーダル */}
      <Modal visible={!!editingTask} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>タスクを編集</Text>
            <View style={styles.editRule} />
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={handleEditSave}
              placeholderTextColor={colors.textDisabled}
            />
            <View style={styles.editActions}>
              <Pressable
                style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.6 }]}
                onPress={() => { setEditingTask(null); setEditTitle(''); }}
              >
                <Text style={styles.editCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.editSaveBtn,
                  !editTitle.trim() && styles.editSaveBtnDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleEditSave}
                disabled={!editTitle.trim()}
              >
                <Text style={styles.editSaveText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

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
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
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
  editOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(26,16,7,0.45)', padding: spacing.lg,
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  editRule: { height: 1, backgroundColor: colors.ink },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
  },
  editCancelText: {
    fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.semibold,
  },
  editSaveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  editSaveBtnDisabled: { backgroundColor: colors.textDisabled },
  editSaveText: {
    fontSize: fontSize.md, color: colors.surface, fontWeight: fontWeight.bold,
  },
});
