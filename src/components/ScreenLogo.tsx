import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, fontSize, fontWeight } from '../theme';

interface Props {
  title: string;
}

export function ScreenLogo({ title }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, styles.titleShadow]}>{title}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingRight: 4,
    paddingBottom: 4,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
  },
  titleShadow: {
    position: 'absolute',
    color: colors.primary,
    left: 2.5,
    top: 2.5,
  },
});
