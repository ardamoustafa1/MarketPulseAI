import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme';
import { Plus } from 'lucide-react-native';

interface PortfolioHeroProps {
  totalValue: string;
  dailyChange: string;
  dailyChangePercent: number;
  /** Label next to the change row (e.g. "Today" or "Unrealized"). */
  changeLineLabel?: string;
  onAddAlert?: () => void;
}

export const PortfolioHero: React.FC<PortfolioHeroProps> = ({
  totalValue,
  dailyChange,
  dailyChangePercent,
  changeLineLabel,
  onAddAlert,
}) => {
  const { t } = useTranslation();
  const isPositive = dailyChangePercent >= 0;
  const sentimentColor = isPositive ? colors.sentiment.bull_green : colors.sentiment.bear_red;
  const sign = isPositive ? '+' : '';
  const effectiveChangeLineLabel = changeLineLabel ?? t('summaryWidget.today');

  return (
    <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.container}>
      <Box row justify="space-between" align="center" style={{ marginBottom: spacing.md }}>
        <Box style={styles.badge}>
          <Text variant="caption" color={colors.text.secondary} weight="700" style={{ letterSpacing: 1.2 }}>
            {t('portfolioHero.portfolioValue')}
          </Text>
        </Box>
        {onAddAlert && (
          <Pressable onPress={onAddAlert} style={styles.iconButton}>
            <Plus color={colors.text.primary} size={22} />
          </Pressable>
        )}
      </Box>
      
      <Box style={{ marginVertical: spacing.xs }}>
        {/* Giant, tightly kerned numbers signify luxury fintech */}
        <Text variant="h1" style={{ fontSize: 52, letterSpacing: -2, fontWeight: '700' }}>
           {totalValue}
        </Text>
      </Box>

      <Box row align="center" style={{ marginTop: spacing.sm }}>
        <Box style={[styles.sentimentBadge, { backgroundColor: isPositive ? 'rgba(59,217,132,0.1)' : 'rgba(255,92,92,0.1)' }]}>
          <Text variant="body" color={sentimentColor} weight="600" style={{ fontSize: 15 }}>
            {sign}{dailyChange} ({sign}{dailyChangePercent.toFixed(2)}%)
          </Text>
        </Box>
        <Text variant="body" color={colors.text.muted} style={{ marginLeft: spacing.sm, fontWeight: '500' }}>
          {effectiveChangeLineLabel}
        </Text>
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
    borderRadius: 99,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  }
});
