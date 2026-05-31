import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, Pressable,
  ScrollView, Dimensions, SafeAreaView,
} from 'react-native';
import { Text } from '../components/Text';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    index: '01',
    title: '自分のペースで、\n続けられる',
    description: 'ADHDの特性に合わせて設計した\nタスク管理アプリ「いっぽ」です',
    features: null,
  },
  {
    index: '02',
    title: 'できたことを\n積み重ねよう',
    description: null,
    features: [
      { icon: '✅', label: 'シンプルなタスク管理', sub: '今日やることを一つずつ整理' },
      { icon: '⚡', label: 'XP とバッジ', sub: 'タスクを完了するたびに経験値を獲得' },
      { icon: '🔥', label: 'ストリーク', sub: '続けた日数が記録されていく' },
      { icon: '🔔', label: 'リマインダー', sub: '忘れないように通知でサポート' },
    ],
  },
  {
    index: '03',
    title: 'できなかった日も、\n罰はありません',
    description: '小さく始めて、少しずつ積み重ねる。\nそれだけで十分です。',
    features: null,
  },
];

export function OnboardingScreen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function goTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  }

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) goTo(currentIndex + 1);
    else completeOnboarding();
  }

  const isLast = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slider}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            {/* Decorative large number */}
            <Text style={styles.bigNum}>{s.index}</Text>

            <View style={styles.rule} />

            <Text style={styles.slideTitle}>{s.title}</Text>

            {s.description && <Text style={styles.description}>{s.description}</Text>}

            {s.features && (
              <View style={styles.featureList}>
                {s.features.map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                    <View style={styles.featureText}>
                      <Text style={styles.featureLabel}>{f.label}</Text>
                      <Text style={styles.featureSub}>{f.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.btnRow}>
          {currentIndex > 0 && (
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => goTo(currentIndex - 1)}
            >
              <Text style={styles.backBtnText}>戻る</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.nextBtn, currentIndex === 0 && styles.nextBtnFull, pressed && { opacity: 0.85 }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>{isLast ? 'はじめる' : '次へ →'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slider: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  bigNum: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.black,
    color: colors.primary,
    letterSpacing: -3,
    lineHeight: 60,
  },
  rule: {
    height: 1.5,
    backgroundColor: colors.ink,
  },
  slideTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    lineHeight: 40,
    letterSpacing: -1,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSub,
    lineHeight: 26,
  },
  featureList: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1, gap: 2 },
  featureLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.ink },
  featureSub: { fontSize: fontSize.sm, color: colors.textSub },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  backBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.ink,
  },
  backBtnText: { fontSize: fontSize.md, color: colors.ink, fontWeight: fontWeight.bold },
  nextBtn: {
    flex: 2, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  nextBtnFull: { flex: 1 },
  nextBtnText: {
    fontSize: fontSize.md, color: colors.surface,
    fontWeight: fontWeight.black, letterSpacing: 0.5,
  },
});
