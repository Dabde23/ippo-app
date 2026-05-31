export const colors = {
  primary: '#0EA5E9',
  primaryLight: '#E0F2FE',
  primaryDark: '#0284C7',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F5F9FF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF6FF',
  border: '#DBEAFE',
  textMain: '#0F172A',
  textSub: '#64748B',
  textDisabled: '#CBD5E1',
  streak: '#F97316',
  xpGold: '#F59E0B',
  badge: '#8B5CF6',
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
  sm: {
    boxShadow: '0px 1px 4px rgba(14,165,233,0.08)',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    boxShadow: '0px 3px 10px rgba(14,165,233,0.12)',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
};
