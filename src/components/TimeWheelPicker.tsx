import React, { useEffect, useRef } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

// ドラムロール時刻ピッカー（時 0〜23 × 分 0〜55 / 5分刻み）
// 時刻文字列は "HH:MM"。NotificationService の処理形式は変えない。

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;             // 220
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);       // 88（中央＝選択行）

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

interface Props {
  value: string;                       // "HH:MM"
  onChange: (time: string) => void;
}

interface ColumnProps {
  data: number[];
  selected: number;
  onSelect: (v: number) => void;
}

function WheelColumn({ data, selected, onSelect }: ColumnProps) {
  const ref = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, data.indexOf(selected));

  // マウント時に現在値へ位置合わせ（contentOffset でも合わせるが Android 保険）
  useEffect(() => {
    const id = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(id);
    // マウント時のみ。値変更による再スクロールは親の再マウント（key）で行う。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    if (data[clamped] !== selected) onSelect(data[clamped]);
  }

  return (
    <ScrollView
      ref={ref}
      style={styles.column}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
      contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
      contentContainerStyle={styles.columnContent}
      nestedScrollEnabled
    >
      {data.map((d) => {
        const active = d === selected;
        return (
          <Pressable
            key={d}
            style={styles.item}
            onPress={() => {
              onSelect(d);
              ref.current?.scrollTo({ y: data.indexOf(d) * ITEM_HEIGHT, animated: true });
            }}
          >
            <Text style={[styles.itemText, active && styles.itemTextActive]}>
              {pad2(d)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function TimeWheelPicker({ value, onChange }: Props) {
  const [hRaw, mRaw] = (value || '00:00').split(':');
  const hour = Math.max(0, Math.min(23, parseInt(hRaw, 10) || 0));
  // 5分刻みに丸める（既存データが5の倍数でない場合の保険）
  const minute = (Math.round((parseInt(mRaw, 10) || 0) / 5) * 5) % 60;

  return (
    <View style={styles.container}>
      <View style={styles.wheelsRow}>
        <WheelColumn
          data={HOURS}
          selected={hour}
          onSelect={(h) => onChange(`${pad2(h)}:${pad2(minute)}`)}
        />
        <Text style={styles.colon}>:</Text>
        <WheelColumn
          data={MINUTES}
          selected={minute}
          onSelect={(m) => onChange(`${pad2(hour)}:${pad2(m)}`)}
        />
      </View>
      {/* 中央の選択バンド（罫線のみ・操作を妨げない） */}
      <View pointerEvents="none" style={styles.selectionBand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    justifyContent: 'center',
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  column: {
    height: PICKER_HEIGHT,
    width: 72,
  },
  columnContent: {
    paddingVertical: PAD,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
  },
  itemTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.black,
  },
  colon: {
    fontSize: fontSize.xl,
    color: colors.textSub,
    fontWeight: fontWeight.black,
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
});
