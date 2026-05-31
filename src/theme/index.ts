export const colors = {
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  primaryDeep: '#075985',
  primaryLight: '#E0F2FE',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F0F7FF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF6FF',
  border: '#DBEAFE',
  textMain: '#0F172A',
  textSub: '#475569',
  textMuted: '#94A3B8',
  textDisabled: '#CBD5E1',
  streak: '#F97316',
  xpGold: '#F59E0B',
  badge: '#8B5CF6',

  // Header text (on primary bg)
  headerText: '#FFFFFF',
  headerTextSub: 'rgba(255,255,255,0.75)',
  headerBorder: 'rgba(255,255,255,0.2)',
  headerTrack: 'rgba(255,255,255,0.25)',
  headerFill: 'rgba(255,255,255,0.9)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 40,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
  card: {
    boxShadow: '0px 4px 16px rgba(14,165,233,0.14)',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  soft: {
    boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};
