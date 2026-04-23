import React, { useMemo } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { Sparkline } from '../charts/Sparkline';
import { colors, radius, sentimentPalette, spacing } from '../../theme';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react-native';

export type HeroRange = '1D' | '1W' | '1M' | '3M';
const RANGES: HeroRange[] = ['1D', '1W', '1M', '3M'];

interface PortfolioHeroProps {
  totalValue: number;
  currency?: string;
  totalValueLabel?: string;
  dailyChange: string;
  dailyChangePercent: number;
  changeLineLabel?: string;
  /** Historical returns keyed by range — used to draw the sparkline. */
  sparklineByRange?: Partial<Record<HeroRange, number[]>>;
  range?: HeroRange;
  onChangeRange?: (next: HeroRange) => void;
  onAddAlert?: () => void;
}

const formatCurrencyFixed = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

export const PortfolioHero: React.FC<PortfolioHeroProps> = ({
  totalValue,
  currency = 'USD',
  totalValueLabel,
  dailyChange,
  dailyChangePercent,
  changeLineLabel,
  sparklineByRange,
  range = '1D',
  onChangeRange,
  onAddAlert,
}) => {
  const { t } = useTranslation();
  const palette = sentimentPalette(dailyChangePercent);
  const sign = palette.isPositive ? '+' : '';
  const effectiveChangeLineLabel = changeLineLabel ?? t('summaryWidget.today');
  const TrendIcon = palette.isPositive ? TrendingUp : TrendingDown;

  const sparkData = useMemo(() => {
    const series = sparklineByRange?.[range];
    if (series && series.length >= 2) return series;
    // Deterministic placeholder so there's always something pleasant to see.
    const base = totalValue || 100;
    const seed = Array.from({ length: 24 }).map((_, i) => {
      const phase = Math.sin(i * 0.45) * (palette.isPositive ? 0.02 : -0.015);
      const drift = (i / 24) * (palette.isPositive ? 0.03 : -0.025);
      return base * (1 + phase + drift);
    });
    return seed;
  }, [sparklineByRange, range, totalValue, palette.isPositive]);

  return (
    <Animated.View entering={FadeInUp.duration(700).springify()} style={styles.container}>
      <Box row justify="space-between" align="center" style={{ marginBottom: spacing.md }}>
        <Box style={styles.badge}>
          <Text variant="caption" color={colors.text.secondary} weight="700" style={{ letterSpacing: 1.2 }}>
            {totalValueLabel ?? t('portfolioHero.portfolioValue')}
          </Text>
        </Box>
        {onAddAlert && (
          <Pressable onPress={onAddAlert} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
            <Plus color={colors.text.primary} size={22} />
          </Pressable>
        )}
      </Box>

      <Box style={{ marginVertical: spacing.xs }}>
        <AnimatedCounter
          value={totalValue}
          durationMs={900}
          format={(n) => formatCurrencyFixed(n, currency)}
          variant="h1"
          weight="700"
          style={{ fontSize: 52, letterSpacing: -2 }}
        />
      </Box>

      <Box row align="center" style={{ marginTop: spacing.sm }}>
        <LinearGradient
          colors={palette.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sentimentBadge, { borderColor: palette.border }]}
        >
          <TrendIcon color={palette.text} size={14} style={{ marginRight: 6 }} />
          <Text variant="body" color={palette.text} weight="700" mono style={{ fontSize: 15 }}>
            {sign}
            {dailyChange} ({sign}
            {dailyChangePercent.toFixed(2)}%)
          </Text>
        </LinearGradient>
        <Text variant="body" color={colors.text.muted} style={{ marginLeft: spacing.sm, fontWeight: '500' }}>
          {effectiveChangeLineLabel}
        </Text>
      </Box>

      <Box row justify="space-between" align="center" style={{ marginTop: spacing.lg }}>
        <Sparkline
          data={sparkData}
          width={180}
          height={48}
          strokeColor={palette.text}
          fillColors={palette.gradient}
        />
        <Box row style={styles.rangeRow}>
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <Pressable
                key={r}
                onPress={() => onChangeRange?.(r)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.rangePill,
                  active && styles.rangePillActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  variant="caption"
                  weight={active ? '700' : '500'}
                  color={active ? colors.text.primary : colors.text.muted}
                  style={{ fontSize: 12 }}
                >
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </Box>
      </Box>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xxl + 20,
    marginBottom: spacing.xxl,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  rangeRow: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rangePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  rangePillActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
