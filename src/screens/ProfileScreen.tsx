import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
const FORMSPREE_URL = 'https://formspree.io/f/xqejvywv';
const EARLY_ACCESS_FORMSPREE_URL = 'https://formspree.io/f/xzdqzqnz';
import { Text } from '../components/Text';
import { ReviewPanel } from '../components/ReviewPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { MoodSparkline, hasSparklineData } from '../components/MoodSparkline';
import { useAppStore } from '../store/useAppStore';
import { PREMIUM_PRICE_JPY } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

export function ProfileScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();

  const tasks = useAppStore((s) => s.tasks);
  const moodEntries = useAppStore((s) => s.moodEntries);
  const isPremium = useAppStore((s) => s.isPremium);

  const completedTotal = tasks.filter((t) => t.completed).length;

  // ハブから開くオーバーレイパネルの開閉 state（RoutinePanel 等の呼び出し方に合わせる）。
  const [reviewPanelVisible, setReviewPanelVisible] = useState(false);
  const [settingsPanelVisible, setSettingsPanelVisible] = useState(false);

  // ベータ運営（フィードバック / 事前登録）の state はそのまま移設。
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [earlyAccessVisible, setEarlyAccessVisible] = useState(false);
  const [earlyEmail, setEarlyEmail] = useState('');
  const [earlySending, setEarlySending] = useState(false);
  const [earlySent, setEarlySent] = useState(false);

  // 振り返りカードのプレビュー横幅（カード内側パディング 2 分を引く）。
  const sparklineWidth = Math.max(0, Math.round(width - spacing.md * 2 - spacing.md * 2));
  const showSparkline = isPremium && hasSparklineData(moodEntries);

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim() || feedbackSending) return;
    setFeedbackSending(true);
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSent(true);
      setFeedbackText('');
      setTimeout(() => {
        setFeedbackSent(false);
        setFeedbackVisible(false);
      }, 1500);
    } catch {
      Alert.alert('送信失敗', '送信できませんでした。もう一度お試しください。');
      // モーダルは開けたまま・入力を保持
    } finally {
      setFeedbackSending(false);
    }
  }

  async function handleEarlyAccessSubmit() {
    const email = earlyEmail.trim();
    if (!email.includes('@') || earlySending) return;
    setEarlySending(true);
    try {
      const res = await fetch(EARLY_ACCESS_FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'early_access_registration',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEarlySent(true);
      setEarlyEmail('');
      setTimeout(() => {
        setEarlySent(false);
        setEarlyAccessVisible(false);
      }, 1500);
    } catch {
      Alert.alert('送信失敗', 'メールアドレスを確認して、もう一度お試しください。');
      // モーダルは開けたまま・入力を保持
    } finally {
      setEarlySending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── HEADER（実績サマリ：完了数のみ・罰でない範囲。XP/バッジは撤去） ── */}
      <View style={styles.header}>
        <View style={styles.rule} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{completedTotal}</Text>
            <Text style={styles.statLabel}>完了</Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.rule} />
      </View>

      {/* ── CONTENT（ハブ） ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 振り返り＝主役カード（上部・視覚的重み大）。タップで ReviewPanel を開く。 */}
        <Pressable
          style={({ pressed }) => [styles.reviewCard, pressed && { opacity: 0.85 }]}
          onPress={() => setReviewPanelVisible(true)}
        >
          <View style={styles.reviewCardHeader}>
            <Text style={styles.reviewCardTitle}>振り返り</Text>
            <Text style={styles.reviewCardArrow}>→</Text>
          </View>

          {/* プレビュー。
              有料 & データ2日以上: 実データのスパークライン＋中立キャプション。
              有料 & データ不足: 空状態の誘い文（捏造しない）。
              無料: プレビューは空・🔒＋短い価値コピーのみ（ぼかしの釣りはしない）。 */}
          {isPremium ? (
            showSparkline ? (
              <View style={styles.previewBox}>
                <MoodSparkline width={sparklineWidth} />
                <Text style={styles.previewCaption}>直近7日間の気分のうつりかわり</Text>
              </View>
            ) : (
              <View style={styles.previewEmptyBox}>
                <Text style={styles.previewInvite}>記録すると、ここにうつりかわりが出ます</Text>
              </View>
            )
          ) : (
            <View style={styles.previewLockedBox}>
              <Text style={styles.previewLockIcon}>🔒</Text>
              <Text style={styles.previewLockCopy}>気分や集中度のうつりかわりを振り返れます</Text>
              <Text style={styles.previewLockPrice}>アーリーアクセス ¥{PREMIUM_PRICE_JPY}/月</Text>
            </View>
          )}
        </Pressable>

        {/* 設定＝控えめなリンク行（下部・埋もれてOK）。タップで SettingsPanel を開く。 */}
        <Pressable
          style={({ pressed }) => [styles.settingsLink, pressed && { opacity: 0.6 }]}
          onPress={() => setSettingsPanelVisible(true)}
        >
          <View style={styles.settingsLinkInner}>
            <Ionicons name="settings-outline" size={18} color={colors.textSub} />
            <Text style={styles.settingsLinkText}>設定</Text>
          </View>
          <Text style={styles.settingsLinkArrow}>→</Text>
        </Pressable>

        {/* スペーサーでベータ運営を最下部に寄せる（除去してもレイアウトが崩れない配置） */}
        <View style={{ flex: 1 }} />

        {/* ベータ運営（最下部固定・ベータ期のみ）。フィードバック送信＋事前登録を移設。 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>フィードバック</Text>
          <View style={styles.rule} />
          <Text style={styles.feedbackDesc}>
            使ってみた感想や改善してほしい点を教えてください。{'\n'}開発の参考にします。
          </Text>
          <Pressable
            style={({ pressed }) => [styles.feedbackBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setFeedbackVisible(true)}
          >
            <Text style={styles.feedbackBtnText}>感想を送る</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.earlyBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setEarlyAccessVisible(true)}
          >
            <Text style={styles.earlyBtnText}>ネイティブアプリの事前登録 →</Text>
          </Pressable>
          <Text style={styles.releaseNotice}>
            ストアリリース開始に伴い一部機能は有料機能になります
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Feedback modal */}
      <Modal visible={feedbackVisible} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>フィードバック</Text>
            <View style={styles.rule} />
            {feedbackSent ? (
              <View style={styles.feedbackSentContainer}>
                <Text style={styles.feedbackSentText}>ありがとうございます！</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={[styles.editInput, styles.feedbackInput]}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  placeholder="使ってみた感想・改善してほしい点など"
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  autoFocus
                  editable={!feedbackSending}
                />
                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => { setFeedbackVisible(false); setFeedbackText(''); }}
                    disabled={feedbackSending}
                  >
                    <Text style={styles.editCancelText}>キャンセル</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.editSaveBtn, (!feedbackText.trim() || feedbackSending) && styles.editSaveBtnDisabled, pressed && { opacity: 0.85 }]}
                    onPress={handleFeedbackSubmit}
                    disabled={!feedbackText.trim() || feedbackSending}
                  >
                    <Text style={styles.editSaveText}>{feedbackSending ? '送信中...' : '送る'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Early access modal */}
      <Modal visible={earlyAccessVisible} animationType="fade" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editLabel}>アーリーアクセス事前登録</Text>
            <View style={styles.rule} />
            {earlySent ? (
              <View style={styles.feedbackSentContainer}>
                <Text style={styles.feedbackSentText}>登録ありがとうございます！</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.editInput}
                  value={earlyEmail}
                  onChangeText={setEarlyEmail}
                  placeholder="メールアドレス"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={200}
                  autoFocus
                  editable={!earlySending}
                />
                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editCancelBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => { setEarlyAccessVisible(false); setEarlyEmail(''); }}
                    disabled={earlySending}
                  >
                    <Text style={styles.editCancelText}>キャンセル</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.editSaveBtn, (!earlyEmail.includes('@') || earlySending) && styles.editSaveBtnDisabled, pressed && { opacity: 0.85 }]}
                    onPress={handleEarlyAccessSubmit}
                    disabled={!earlyEmail.includes('@') || earlySending}
                  >
                    <Text style={styles.editSaveText}>{earlySending ? '送信中...' : '送信'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* オーバーレイパネル（RoutinePanel と同じ条件描画パターン） */}
      {reviewPanelVisible && (
        <ReviewPanel onClose={() => setReviewPanelVisible(false)} />
      )}
      {settingsPanelVisible && (
        <SettingsPanel onClose={() => setSettingsPanelVisible(false)} />
      )}
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statNum: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    marginTop: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  // 振り返り主役カード（視覚的重み大）
  reviewCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  reviewCardArrow: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.primary,
  },
  previewBox: {
    gap: spacing.xs,
  },
  previewCaption: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  previewEmptyBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  previewInvite: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  previewLockedBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewLockIcon: {
    fontSize: 28,
  },
  previewLockCopy: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textAlign: 'center',
  },
  previewLockPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  // 設定リンク行（控えめ）
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLinkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsLinkText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSub,
    letterSpacing: 0.5,
  },
  settingsLinkArrow: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  // ベータ運営
  feedbackDesc: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
  },
  feedbackBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  feedbackBtnText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  earlyBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  earlyBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  releaseNotice: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  // Modals
  feedbackInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  feedbackSentContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  feedbackSentText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  editOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(26,16,7,0.5)', padding: spacing.lg,
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
  },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  editCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
  },
  editCancelText: { fontSize: fontSize.md, color: colors.textSub, fontWeight: fontWeight.semibold },
  editSaveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 13,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  editSaveBtnDisabled: { backgroundColor: colors.textDisabled },
  editSaveText: { fontSize: fontSize.md, color: colors.surface, fontWeight: fontWeight.bold },
});
