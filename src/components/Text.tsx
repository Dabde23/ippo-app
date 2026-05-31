import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

const FONT_MAP: Record<string, string> = {
  normal:  'BIZUDPGothic_400Regular',
  '400':   'BIZUDPGothic_400Regular',
  '500':   'BIZUDPGothic_400Regular',
  '600':   'BIZUDPGothic_700Bold',
  '700':   'BIZUDPGothic_700Bold',
  bold:    'BIZUDPGothic_700Bold',
  '800':   'BIZUDPGothic_700Bold',
  '900':   'BIZUDPGothic_700Bold',
};

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style);
  const weight = (flat?.fontWeight as string) ?? '400';
  const fontFamily = FONT_MAP[weight] ?? 'BIZUDPGothic_400Regular';
  return <RNText style={[style, { fontFamily }]} {...props} />;
}
