import React, { useState } from 'react';
import {
  View, StyleSheet, Pressable, Modal, ScrollView, Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LineChart } from 'react-native-gifted-charts';
import { Text } from './Text';
import { useAppStore, MoodEntry, FocusEntry } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, moodColors } from '../theme';

const MOOD_LINE = '#3B82F6';
const FOCUS_LINE = '#22C55E';

const PERIODS = [
  { key: 'week', label: '1週間', days: 7 },
  { key: 'month', label: '1か月', days: 30 },
  { key: 'quarter', label: '3か月', days: 90 },
] as const;
type PeriodKey = (typeof PERIODS)[number]['key'];

// ローカル日付 YYYY-MM-DD
function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateOf(ts: string): string {
  return localDate(new Date(ts));
}

function timeOf(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 日ごとの平均（四捨五入）マップを作る
function averageByDate(entries: { timestamp: string; level: number }[]): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const e of entries) {
    const d = dateOf(e.timestamp);
    (buckets[d] ||= []).push(e.level);
  }
  const out: Record<string, number> = {};
  for (const d of Object.keys(buckets)) {
    const arr = buckets[d];
    out[d] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return out;
}

// 欠損日を前方/後方補完して連続ラインにする（簡易グラフ向け）
function buildSeries(avgMap: Record<string, number>, days: string[]): { value: number }[] | null {
  const raw = days.map((d) => (d in avgMap ? avgMap[d] : null));
  if (raw.every((v) => v === null)) return null;
  // 前方補完: 直近の有効値を保持して欠損を埋める
  const filled: number[] = [];
  let last: number | null = null;
  for (const v of raw) {
    if (v !== null) last = v;
    filled.push(last as number); // 先頭欠損は後で補正するため一旦そのまま
  }
  // 先頭の欠損（last がまだ null だった区間）を最初の有効値で後方補完
  const firstVal = raw.find((v) => v !== null) as number;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== null) break;
    filled[i] = firstVal;
  }
  return filled.map((value) => ({ value }));
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
        text: { color: '#FFFFFF', fontWeight: '700' },
      },
    };
  }

  // ── 詳細シート: 選択日のエントリ ──
  const dayMoods: MoodEntry[] = selectedDate
    ? moodEntries.filter((e) => dateOf(e.timestamp) === selectedDate).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    : [];
  const dayFocus: FocusEntry[] = selectedDate
    ? focusEntries.filter((e) => dateOf(e.timestamp) === selectedDate).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    : [];

  // ── グラフ: 期間内の日次平均 ──
  const periodDays = PERIODS.find((p) => p.key === period)!.days;
  const today = new Date();
  const days: string[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(localDate(d));
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
            const isToday = dateStr === localDate(new Date());

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
                    hasMark && { color: '#FFFFFF', fontWeight: '700' },
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
              hideDataPoints1={periodDays > 7}
              hideDataPoints2={periodDays > 7}
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
            <Text style={styles.graphEmptyText}>まだ記録がありません</Text>
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
                      <Text style={styles.entryTime}>{timeOf(e.timestamp)}</Text>
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
                      <Text style={styles.entryTime}>{timeOf(e.timestamp)}</Text>
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
