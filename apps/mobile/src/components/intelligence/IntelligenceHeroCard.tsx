import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react-native';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { PortfolioSignal, RegimeSection } from '../../api/intelligence';
import { colors, radius, spacing } from '../../theme';

interface Props {
  portfolio: PortfolioSignal | null;
  regime: RegimeSection;
}

const ACTION_COLORS: Record<string, [string, string]> = {
  ADD_RISK: ['rgba(59,217,132,0.30)', 'rgba(59,217,132,0.05)'],
  HOLD: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)'],
  REDUCE_RISK: ['rgba(255,92,92,0.32)', 'rgba(255,92,92,0.06)'],
  PROTECT: ['rgba(255,204,77,0.28)', 'rgba(255,204,77,0.04)'],
};

const REGIME_COLORS: Record<string, [string, string]> = {
  risk_on: ['rgba(59,217,132,0.22)', 'rgba(59,217,132,0.02)'],
  risk_off: ['rgba(255,92,92,0.22)', 'rgba(255,92,92,0.02)'],
  rotation: ['rgba(122,159,255,0.22)', 'rgba(122,159,255,0.02)'],
  neutral: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
};

export const IntelligenceHeroCard: React.FC<Props> = ({ portfolio, regime }) => {
  const { t } = useTranslation();

  const actionKey = portfolio?.action ?? 'HOLD';
  const gradient = ACTION_COLORS[actionKey] ?? ACTION_COLORS.HOLD;
  const regimeGradient = REGIME_COLORS[regime.regime] ?? REGIME_COLORS.neutral;

  const headline = portfolio?.headline ?? t('intelligence.heroEmpty');

  return (
    <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.container}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientFill} />
      <Box style={styles.content}>
        <Box row justify="space-between" align="center">
          <Box row align="center">
            <ShieldCheck color={colors.accent.premium_gold} size={18} style={{ marginRight: 6 }} />
            <Text variant="caption" weight="700" style={{ letterSpacing: 1.1 }} color={colors.accent.premium_gold}>
              {t('intelligence.heroEyebrow')}
            </Text>
          </Box>
          <Box style={{ borderRadius: radius.pill, borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 }}>
            <LinearGradient
              colors={regimeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text variant="caption" weight="700">{t(`intelligence.regime.${regime.regime}`)}</Text>
          </Box>
        </Box>

        <Text variant="h2" weight="700" style={{ marginTop: spacing.md, letterSpacing: -0.4 }}>
          {headline}
        </Text>

        {portfolio ? (
          <Text variant="body" color={colors.text.secondary} style={{ marginTop: spacing.sm, lineHeight: 22 }}>
            {portfolio.rationale}
          </Text>
        ) : (
          <Text variant="body" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            {t('intelligence.heroHint')}
          </Text>
        )}

        <Box row style={{ marginTop: spacing.md, gap: 8, flexWrap: 'wrap' }}>
          <Chip
            icon={<TrendingUp color={colors.sentiment.bull_green} size={13} />}
            label={t('intelligence.bullishChip', { count: portfolio?.net_bullish ?? 0 })}
          />
          <Chip
            icon={<TrendingDown color={colors.sentiment.bear_red} size={13} />}
            label={t('intelligence.bearishChip', { count: portfolio?.net_bearish ?? 0 })}
          />
          <Chip label={t('intelligence.confidence', { value: Math.round((portfolio?.confidence ?? regime.confidence) * 100) })} />
        </Box>
      </Box>
    </Animated.View>
  );
};

const Chip: React.FC<{ label: string; icon?: React.ReactNode }> = ({ label, icon }) => (
  <Box row align="center" style={styles.chip}>
    {icon ? <Box style={{ marginRight: 5 }}>{icon}</Box> : null}
    <Text variant="caption" weight="600">{label}</Text>
  </Box>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(24,26,32,0.68)',
    marginBottom: spacing.lg,
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    padding: spacing.lg,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
