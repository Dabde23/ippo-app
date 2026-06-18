import React, { useState } from 'react';
import {
  View, StyleSheet, Pressable, Modal, ScrollView, Dimensions,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { LineChart } from 'react-native-gifted-charts';
import { Text } from './Text';
import { useAppStore, MoodEntry, FocusEntry } from '../store/useAppStore';
import { dateOfJST, today, timeOfJST } from '../utils/date';
import { colors, spacing, radius, fontSize, fontWeight, moodColors, contrastTextColor } from '../theme';

// カレンダー日本語化（曜日ヘッダーは一文字・週始まりは日曜）
LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

const MOOD_LINE = '#3B82F6';
const FOCUS_LINE = '#22C55E';

const PERIODS = [
  { key: 'week', label: '1週間', days: 7 },
  { key: 'month', label: '1か月', days: 30 },
  { key: 'quarter', label: '3か月', days: 90 },
] as const;
type PeriodKey = (typeof PERIODS)[number]['key'];

// 日付・時刻は JST 統一ユーティリティ(utils/date)を使用する（QA #001）。
// dateOfJST = JST の YYYY-MM-DD / timeOfJST = JST の HH:MM。

// 日ごとの平均（四捨五入）マップを作る
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

// 記録のある日の実データのみを返す（補完で値を捏造しない）
function buildSeries(avgMap: Record<string, number>, days: string[]): { value: number }[] | null {
  const points = days.filter((d) => d in avgMap).map((d) => ({ value: avgMap[d] }));
  return points.length === 0 ? null : points;
}

export function TrackingPanel() {
  // セレクタは配列をそのまま取得（webの無限ループ回避）
  const moodEntries = useAppStore((s) => s.moodEntries);
  const focusEntries = useAppStore((s) => s.focusEntries);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('month');

  // ── カレンダー: 日ごとの気分平均色 ──
  const moodAvgMap = averageByDate(moodEntries);
  const markedDates: Record<string, any> = {};
  for (const d of Object.keys(moodAvgMap)) {
    const lvl = moodAvgMap[d] as 1 | 2 | 3 | 4 | 5;
    const color = moodColors[lvl] ?? colors.textMuted;
    markedDates[d] = {
      customStyles: {
        container: { backgroundColor: color, borderRadius: 16 },
        text: { color: contrastTextColor(color), fontWeight: '700' },
      },
    };
  }

  // ── 詳細シート: 選択日のエントリ ──
  const dayMoods: MoodEntry[] = selectedDate
    ? moodEntries.filter((e) => dateOfJST(e.timestamp) === selectedDate).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    : [];
  const dayFocus: FocusEntry[] = selectedDate
    ? focusEntries.filter((e) => dateOfJST(e.timestamp) === selectedDate).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    : [];

  // ── グラフ: 期間内の日次平均 ──
  // JST 基準で直近 periodDays 日の日付列を作る。JST は DST が無いため
  // 1日=86,400,000ms の単純減算で正しい前日が得られる。
  const periodDays = PERIODS.find((p) => p.key === period)!.days;
  const DAY_MS = 86400000;
  const nowMs = Date.now();
  const days: string[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    days.push(dateOfJST(nowMs - i * DAY_MS));
  }
  const focusAvgMap = averageByDate(focusEntries);
  const moodSeries = buildSeries(moodAvgMap, days);
  const focusSeries = buildSeries(focusAvgMap, days);

  const screenW = Dimensions.get('window').width;
  const chartWidth = Math.max(0, screenW - spacing.md * 2 - spacing.md * 2 - 40);

  const hasGraphData = moodSeries != null || focusSeries != null;

  // 存在する系列だけを描画（片方しか無い場合に 0 の偽ラインを引かない）
  const primary = moodSeries
    ? { data: moodSeries, color: MOOD_LINE }
    : focusSeries
      ? { data: focusSeries, color: FOCUS_LINE }
      : null;
  const secondary = moodSeries && focusSeries
    ? { data: focusSeries, color: FOCUS_LINE }
    : null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>気分トラッカー</Text>
      <View style={styles.rule} />

      {/* カレンダー */}
      <View style={styles.calendarCard}>
        <Calendar
          firstDay={0}
          markingType="custom"
          markedDates={markedDates}
          onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
          renderHeader={(date: any) => {
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return (
              <Text style={styles.calendarHeader}>{year}年 {month}月</Text>
            );
          }}
          dayComponent={({ date, state, marking }: any) => {
            const dateStr: string = date?.dateString ?? '';
            const isSunday = new Date(dateStr + 'T00:00:00').getDay() === 0;
            const isDisabled = state === 'disabled';
            const isToday = dateStr === today();

            const customStyle = marking?.customStyles;
            const hasMark = !!customStyle?.container?.backgroundColor;

            let textColor = colors.textMain;
            if (isDisabled) textColor = colors.textDisabled;
            else if (isToday) textColor = colors.primary;
            else if (isSunday) textColor = '#E07070';

            return (
              <Pressable
                onPress={() => date && setSelectedDate(dateStr)}
                style={{ alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}
              >
                <View style={[
                  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
                  hasMark && { backgroundColor: customStyle.container.backgroundColor },
                  isToday && { borderWidth: 1.5, borderColor: colors.primary },
                ]}>
                  <Text style={[
                    { fontSize: 14, fontWeight: '400' },
                    hasMark && { color: contrastTextColor(customStyle.container.backgroundColor), fontWeight: '700' },
                    !hasMark && { color: textColor },
                  ]}>
                    {date?.day}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          theme={{
            calendarBackground: colors.surface,
            monthTextColor: colors.ink,
            textMonthFontWeight: '700',
            dayTextColor: colors.textMain,
            textDisabledColor: colors.textDisabled,
            todayTextColor: colors.primary,
            arrowColor: colors.primary,
            textDayFontSize: 14,
            textMonthFontSize: 16,
          }}
        />
        <Text style={styles.calendarHint}>色は気分の平均（赤=低 → 緑=高）。日付をタップで詳細。</Text>
      </View>

      {/* グラフ */}
      <View style={styles.graphCard}>
        <View style={styles.periodChips}>
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <Pressable
                key={p.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPeriod(p.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 凡例 */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: MOOD_LINE }]} />
            <Text style={styles.legendText}>気分</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: FOCUS_LINE }]} />
            <Text style={styles.legendText}>集中度</Text>
          </View>
        </View>

        {hasGraphData && primary ? (
          <View style={styles.chartWrap}>
            <LineChart
              data={primary.data}
              data2={secondary?.data}
              color1={primary.color}
              color2={secondary?.color}
              thickness1={2}
              thickness2={2}
              hideDataPoints1={moodSeries != null && moodSeries.length > 1 && periodDays > 7}
              hideDataPoints2={focusSeries != null && focusSeries.length > 1 && periodDays > 7}
              dataPointsColor1={primary.color}
              dataPointsColor2={secondary?.color}
              dataPointsRadius={3}
              maxValue={5}
              noOfSections={5}
              stepValue={1}
              yAxisOffset={0}
              adjustToWidth
              width={chartWidth}
              height={160}
              initialSpacing={8}
              endSpacing={8}
              hideRules={false}
              rulesColor={colors.border}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 11 }}
              hideYAxisText={false}
            />
          </View>
        ) : (
          <View style={styles.graphEmpty}>
            <Text style={styles.graphEmptyText}>記録すると、ここにうつりかわりが出ます</Text>
          </View>
        )}
      </View>

      {/* 詳細シート（下からスライドイン） */}
      <Modal
        visible={selectedDate != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDate(null)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedDate(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetDate}>{selectedDate}</Text>
            <View style={styles.rule} />

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {dayMoods.length === 0 && dayFocus.length === 0 && (
                <Text style={styles.sheetEmpty}>この日の記録はありません</Text>
              )}

              {dayMoods.length > 0 && (
                <View style={styles.sheetGroup}>
                  <Text style={styles.sheetGroupLabel}>気分</Text>
                  {dayMoods.map((e) => (
                    <View key={e.id} style={styles.entryRow}>
                      <Text style={styles.entryTime}>{timeOfJST(e.timestamp)}</Text>
                      <View style={[styles.entryDot, { backgroundColor: moodColors[e.level] }]} />
                      <Text style={styles.entryLevel}>{e.level}</Text>
                      {e.memo ? <Text style={styles.entryMemo} numberOfLines={1}>{e.memo}</Text> : null}
                    </View>
                  ))}
                </View>
              )}

              {dayFocus.length > 0 && (
                <View style={styles.sheetGroup}>
                  <Text style={styles.sheetGroupLabel}>集中度</Text>
                  {dayFocus.map((e) => (
                    <View key={e.id} style={styles.entryRow}>
                      <Text style={styles.entryTime}>{timeOfJST(e.timestamp)}</Text>
                      <View style={[styles.entryDot, { backgroundColor: moodColors[e.level] }]} />
                      <Text style={styles.entryLevel}>{e.level}</Text>
                      <Text style={styles.entryTask} numberOfLines={1}>{e.taskTitle}</Text>
                      {e.memo ? <Text style={styles.entryMemo} numberOfLines={1}>{e.memo}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setSelectedDate(null)}
            >
              <Text style={styles.closeBtnText}>閉じる</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  rule: { height: 1, backgroundColor: colors.ink },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  calendarHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  calendarHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  graphCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  periodChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSub,
  },
  chipTextActive: { color: colors.primary },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: fontSize.xs, color: colors.textSub, fontWeight: fontWeight.bold },
  chartWrap: {
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  graphEmpty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  graphEmptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,7,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  sheetDate: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  sheetEmpty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  sheetGroup: { gap: spacing.xs, marginTop: spacing.md },
  sheetGroupLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  entryTime: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    fontWeight: fontWeight.bold,
    width: 48,
  },
  entryDot: { width: 14, height: 14, borderRadius: 7 },
  entryLevel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: colors.ink,
    width: 16,
  },
  entryTask: {
    fontSize: fontSize.sm,
    color: colors.textMain,
    flexShrink: 1,
  },
  entryMemo: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flexShrink: 1,
  },
  closeBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  closeBtnText: {
    fontSize: fontSize.md,
    color: colors.textSub,
    fontWeight: fontWeight.bold,
  },
});
