import React, { useState } from 'react';
import {
  View, StyleSheet, Pressable, Modal, TextInput,
  LayoutAnimation, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useAppStore, TrackingLevel } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, moodColors, shadow } from '../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// 各段階のアイコン（仕様準拠）
const LEVEL_ICONS: Record<TrackingLevel, IoniconName> = {
  1: 'sad-outline',
  2: 'sad',
  3: 'remove-circle-outline',
  4: 'happy',
  5: 'happy',
};

const LEVELS: TrackingLevel[] = [1, 2, 3, 4, 5];

export function MoodInput() {
  const addMoodEntry = useAppStore((s) => s.addMoodEntry);

  const [expanded, setExpanded] = useState(false);
  const [memoVisible, setMemoVisible] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<TrackingLevel | null>(null);
  const [memo, setMemo] = useState('');

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }

  function handleSelectLevel(level: TrackingLevel) {
    setPendingLevel(level);
    setMemo('');
    setExpanded(false);
    setMemoVisible(true);
  }

  function saveEntry(withMemo: boolean) {
    if (pendingLevel == null) return;
    addMoodEntry(pendingLevel, withMemo ? memo : undefined);
    setMemoVisible(false);
    setPendingLevel(null);
    setMemo('');
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {/* インライン展開する5段階（左方向に展開） */}
        {expanded && (
          <View style={styles.levels}>
            {LEVELS.map((level) => (
              <Pressable
                key={level}
                style={({ pressed }) => [styles.levelBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleSelectLevel(level)}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                accessibilityRole="button"
                accessibilityLabel={`気分 ${level}`}
              >
                <Ionicons name={LEVEL_ICONS[level]} size={30} color={moodColors[level]} />
              </Pressable>
            ))}
          </View>
        )}

        {/* トリガー */}
        <Pressable
          style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.6 }]}
          onPress={toggleExpanded}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="今の気分を記録"
        >
          <Text style={styles.triggerText}>今の気分は？</Text>
        </Pressable>
      </View>

      {/* 展開中は外側タップで閉じる透明オーバーレイ */}
      {expanded && (
        <Pressable
          style={styles.dismissLayer}
          onPress={toggleExpanded}
          accessibilityLabel="閉じる"
        />
      )}

      {/* メモ入力モーダル */}
      <Modal visible={memoVisible} transparent animationType="fade" onRequestClose={() => saveEntry(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.overlay} onPress={() => saveEntry(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                {pendingLevel != null && (
                  <Ionicons name={LEVEL_ICONS[pendingLevel]} size={32} color={moodColors[pendingLevel]} />
                )}
                <Text style={styles.sheetTitle}>今の気分</Text>
              </View>
              <View style={styles.rule} />
              <TextInput
                style={styles.input}
                value={memo}
                onChangeText={setMemo}
                placeholder="ひとことメモ（任意）"
                placeholderTextColor={colors.textDisabled}
                maxLength={140}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => saveEntry(true)}
              />
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
                  onPress={() => saveEntry(false)}
                >
                  <Text style={styles.skipText}>スキップ</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => saveEntry(true)}
                >
                  <Text style={styles.saveText}>保存</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // bottomBar 内に置く想定
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 2,
  },
  trigger: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
  },
  levels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  levelBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLayer: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,7,0.30)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  sheet: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.ink,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  input: {
    fontSize: fontSize.md,
    color: colors.textMain,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  skipText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.semibold,
  },
  saveBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.bold,
  },
});
