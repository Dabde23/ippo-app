import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useAppStore } from '../store/useAppStore';
import { dateOfJST } from '../utils/date';
import { colors } from '../theme';

const MOOD_LINE = '#3B82F6';
const DAY_MS = 86400000;
const PREVIEW_DAYS = 7;

// 日ごとの気分平均（四捨五入）を作る。捏造をしないため記録のある日だけを対象にする（B-1）。
function averageByDate(entries: { timestamp: string; level: number }[]): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const e of entries) {
    const d = dateOfJST(e.timestamp);
    (buckets[d] ||= []).push(e.level);
  }
  const out: Record<string, number> = {};
  for (const d of Object.keys(buckets)) {
    const arr = buckets[d];
    out[d] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return out;
}

interface Props {
  width: number;
  height?: number;
}

// ハブの振り返りカード用 極小スパークライン。
// - 直近7日のうち「記録がある日だけ」の実データを点として並べる（前方/後方補完=捏造はしない / B-1）。
// - 0〜1日 → null を返す（親が空状態の誘い文を出す）。2日以上 → ドットを線で接続。
export function MoodSparkline({ width, height = 44 }: Props) {
  const moodEntries = useAppStore((s) => s.moodEntries);
  const avgMap = averageByDate(moodEntries);

  // 直近 PREVIEW_DAYS 日（JST）の日付列を作り、記録のある日の実値だけを残す。
  const nowMs = Date.now();
  const points: { value: number }[] = [];
  for (let i = PREVIEW_DAYS - 1; i >= 0; i--) {
    const d = dateOfJST(nowMs - i * DAY_MS);
    if (d in avgMap) points.push({ value: avgMap[d] });
  }

  // 2日未満は線を引かない（動きが出ず予感にならない・捏造の温床になりやすい）。
  if (points.length < 2) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <LineChart
        data={points}
        color1={MOOD_LINE}
        thickness1={2}
        dataPointsColor1={MOOD_LINE}
        dataPointsRadius={3}
        maxValue={5}
        yAxisOffset={1}
        noOfSections={1}
        adjustToWidth
        width={Math.max(0, width)}
        height={height}
        initialSpacing={6}
        endSpacing={6}
        hideRules
        hideYAxisText
        yAxisColor="transparent"
        xAxisColor={colors.border}
        hideAxesAndRules
      />
    </View>
  );
}

// 直近7日に記録のある日が2日以上あるか（カードのプレビュー有無の判定に使う）。
export function hasSparklineData(moodEntries: { timestamp: string; level: number }[]): boolean {
  const avgMap = averageByDate(moodEntries);
  const nowMs = Date.now();
  let count = 0;
  for (let i = PREVIEW_DAYS - 1; i >= 0; i--) {
    const d = dateOfJST(nowMs - i * DAY_MS);
    if (d in avgMap) count++;
  }
  return count >= 2;
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
