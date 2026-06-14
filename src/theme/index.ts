// BRUTUS editorial — black × beige × terracotta
export const colors = {
  primary: '#C4603A',       // terracotta
  primaryLight: '#F5E9E2',  // light terracotta tint
  primaryDark: '#A04828',   // deep terracotta
  success: '#4A7C59',       // muted sage green
  successLight: '#E6EFE9',
  warning: '#C4863A',
  danger: '#B94040',
  background: '#F5F0E8',    // warm cream paper
  surface: '#FDFBF5',       // near-white cream
  surfaceAlt: '#ECE7DC',    // medium cream
  border: '#D8D0C0',        // warm gray
  borderStrong: '#B0A898',
  ink: '#1A1007',           // warm black
  textMain: '#1A1007',
  textSub: '#6B5F4A',       // warm brown-gray
  textMuted: '#9A8E7A',
  textDisabled: '#C0B8A8',
  xpGold: '#C4603A',        // use terracotta for XP
  badge: '#6B4A8C',
};

// 気分・集中度の5段階カラー（1=低 → 5=高）
export const moodColors = {
  1: '#F87171', // 淡い赤
  2: '#FDBA74', // 淡い橙
  3: '#FDE047', // 淡い黄
  4: '#A3E635', // 黄緑（yellow-green）
  5: '#34D399', // エメラルドグリーン（青緑寄り、4との色相差確保）
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 15,
  sm: 16,
  md: 18,
  lg: 18,
  xl: 22,
  xxl: 30,
  xxxl: 44,
  display: 56,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

// 背景色に対して読みやすい文字色（白 or 濃色）を返す
// sRGB 相対輝度（簡易）を使って明度を判定
// 閾値 0.6: moodColors の全レベル（1=#F87171〜5=#34D399）が濃色側に倒れる
export function contrastTextColor(hexBg: string): string {
  const hex = hexBg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? colors.ink : '#FFFFFF'; // 明るい背景には濃色
}

export const shadow = {
  card: {
    boxShadow: '2px 3px 12px rgba(26,16,7,0.08)',
    shadowColor: '#1A1007',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  soft: {
    boxShadow: '0px 1px 4px rgba(26,16,7,0.05)',
    shadowColor: '#1A1007',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};
