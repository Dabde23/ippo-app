import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Pressable, Modal, TextInput,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useAppStore, TrackingLevel } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, moodColors, shadow } from '../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// 集中度の5段階アイコン（気分と同じ配色）
const LEVEL_ICONS: Record<TrackingLevel, IoniconName> = {
  1: 'sad-outline',
  2: 'sad',
  3: 'remove-circle-outline',
  4: 'happy',
  5: 'happy',
};

const LEVELS: TrackingLevel[] = [1, 2, 3, 4, 5];

interface Props {
  visible: boolean;
  taskId: string;
  taskTitle: string;
  onClose: () => void; // 保存・スキップどちらでも呼ぶ（閉じる処理は親が担当）
}

export function FocusModal({ visible, taskId, taskTitle, onClose }: Props) {
  const addFocusEntry = useAppStore((s) => s.addFocusEntry);
  const [level, setLevel] = useState<TrackingLevel | null>(null);
  const [memo, setMemo] = useState('');

  // 開くたびに内部状態をリセット
  useEffect(() => {
    if (visible) {
      setLevel(null);
      setMemo('');
    }
  }, [visible]);

  function handleSave() {
    if (level == null) return;
    addFocusEntry(level, taskId, taskTitle, memo);
    onClose();
  }

  function handleSkip() {
    // 記録せず閉じるだけ
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>集中できた？</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{taskTitle}</Text>
            <View style={styles.rule} />

            {/* 5段階アイコン */}
            <View style={styles.levels}>
              {LEVELS.map((lv) => {
                const selected = level === lv;
                return (
                  <Pressable
                    key={lv}
                    style={({ pressed }) => [
                      styles.levelBtn,
                      selected && { backgroundColor: colors.surfaceAlt },
                      pressed && { opacity: 0.5 },
                    ]}
                    onPress={() => setLevel(lv)}
                    hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                    accessibilityRole="button"
                    accessibilityLabel={`集中度 ${lv}`}
                  >
                    <Ionicons
                      name={LEVEL_ICONS[lv]}
                      size={34}
                      color={moodColors[lv]}
                      style={!selected && level != null ? { opacity: 0.35 } : undefined}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* 選択後にメモ入力欄を表示 */}
            {level != null && (
              <TextInput
                style={styles.input}
                value={memo}
                onChangeText={setMemo}
                placeholder="ひとことメモ（任意）"
                placeholderTextColor={colors.textDisabled}
                maxLength={140}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            )}

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
                onPress={handleSkip}
              >
                <Text style={styles.skipText}>スキップ</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  level == null && styles.saveBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleSave}
                disabled={level == null}
              >
                <Text style={styles.saveText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,7,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
    ...shadow.card,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  rule: {
    height: 1,
    backgroundColor: colors.ink,
  },
  levels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  levelBtn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
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
  saveBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  saveText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.bold,
  },
});
