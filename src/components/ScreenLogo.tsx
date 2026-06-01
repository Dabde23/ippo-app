import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Text } from './Text';
import { colors, fontSize, fontWeight } from '../theme';

interface Props {
  title: string;
  accent?: 'bar' | 'dot';
}

export function ScreenLogo({ title, accent = 'dot' }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.accentWrapper}>
        {accent === 'bar' ? (
          <Svg width={10} height={46} style={styles.svgBar}>
            <Rect x={0} y={4} width={10} height={10} fill={colors.primary} />
            <Line x1={5} y1={18} x2={5} y2={46} stroke={colors.primary} strokeWidth={2} />
          </Svg>
        ) : (
          <Svg width={10} height={46} style={styles.svgBar}>
            <Rect x={0} y={4} width={10} height={10} fill={colors.primary} />
          </Svg>
        )}
      </View>
      <View>
        <Text style={styles.title}>{title}</Text>
        {accent === 'bar' && (
          <Svg width={56} height={3} style={styles.underline}>
            <Rect x={0} y={0} width={56} height={3} fill={colors.primary} />
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  accentWrapper: {
    paddingTop: 2,
  },
  svgBar: {},
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
  },
  underline: {
    marginTop: 2,
  },
});
