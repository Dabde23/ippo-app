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
      { icon: '✅', label: 'シンプルなタスク管理', sub: '優先度をつけて今日やることを整理' },
      { icon: '⚡', label: 'XPとバッジ', sub: 'タスクを完了するたびに経験値を獲得' },
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
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Buttons */}
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
    fontSize: 80,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    textAlign: 'center',
    lineHeight: 44,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 26,
  },
  featureList: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  featureIcon: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    gap: spacing.xs,
  },
  featureLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  featureSub: {
    fontSize: fontSize.sm,
    color: colors.textSub,
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
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
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
    paddingVertical: spacing.md,
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
