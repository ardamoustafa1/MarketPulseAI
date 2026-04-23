import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

interface Props {
  pnlPct: number | null | undefined;
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * A whole-screen gradient that leans slightly green or red based on the
 * portfolio's day P/L. Sits behind content and never blares — max opacity 0.14.
 */
export const DynamicBgTint: React.FC<Props> = ({ pnlPct, style, children }) => {
  const magnitude = Math.min(Math.abs(pnlPct ?? 0), 6);
  const alpha = (magnitude / 6) * 0.14;
  const tintColor =
    (pnlPct ?? 0) >= 0 ? colors.sentiment.bull_green : colors.sentiment.bear_red;
  const rgba = withAlpha(tintColor, alpha);

  return (
    <View style={[{ flex: 1 }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[rgba, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
};

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}
