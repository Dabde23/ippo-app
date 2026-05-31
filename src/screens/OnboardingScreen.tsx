import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🧠',
    title: '自分のペースで、\n続けられる',
    description: 'ADHDの特性に合わせて設計した\nタスク管理アプリ「いっぽ」です',
    features: null,
  },
  {
    emoji: null,
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
    emoji: '💙',
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
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slider}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            {slide.emoji && (
              <Text style={styles.emoji}>{slide.emoji}</Text>
            )}
            <Text style={styles.title}>{slide.title}</Text>
            {slide.description && (
              <Text style={styles.description}>{slide.description}</Text>
            )}
            {slide.features && (
              <View style={styles.featureList}>
                {slide.features.map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <View style={styles.featureIconWrap}>
                      <Text style={styles.featureIcon}>{f.icon}</Text>
                    </View>
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
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.btnRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => goTo(currentIndex - 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>戻る</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, currentIndex === 0 && styles.nextBtnFull]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? 'はじめる' : '次へ'}
            </Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 26,
  },
  featureList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  featureSub: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  backBtnText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.medium,
  },
  nextBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  nextBtnFull: {
    flex: 1,
  },
  nextBtnText: {
    fontSize: fontSize.md,
    color: colors.surface,
    fontWeight: fontWeight.semibold,
  },
});
