export const colors = {
  primary: '#6366F1',
  primaryLight: '#EEF2FF',
  primaryDark: '#4338CA',
  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#D97706',
  danger: '#DC2626',
  background: '#F8F8F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F3F2',
  border: '#E5E5E4',
  textMain: '#1A1A1A',
  textSub: '#737373',
  textDisabled: '#D4D4D4',
  xpGold: '#B45309',
  badge: '#7C3AED',
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
  lg: 16,
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
  sm: {
    boxShadow: '0px 1px 3px rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};
