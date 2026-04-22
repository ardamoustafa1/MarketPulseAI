import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface PortfolioSummaryProps {
  totalValue: string;
  totalInvested: string;
  unrealizedPnl: string;
  unrealizedPnlPercent: number;
  realizedPnl: string;
  dailyChange: string;
  dailyChangePercent: number;
}

export const SummaryWidget: React.FC<PortfolioSummaryProps> = ({
  totalValue, totalInvested, unrealizedPnl, unrealizedPnlPercent, realizedPnl, dailyChange, dailyChangePercent
}) => {
  const { t } = useTranslation();
  const isDailyPos = dailyChangePercent >= 0;
  const isUnrealizedPos = unrealizedPnlPercent >= 0;

  return (
    <Box>
      <Box style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md }}>
        <Box style={{ backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12 }}>
           <Text variant="caption" color={colors.text.secondary} weight="700" style={{ letterSpacing: 1.5 }}>
             {t('summaryWidget.totalPortfolio')}
           </Text>
        </Box>
        <Text variant="h1" style={{ fontSize: 56, letterSpacing: -2.5, fontWeight: '700' }}>
          {totalValue}
        </Text>
        <Box row align="center" style={{ marginTop: spacing.md }}>
          <Box style={[styles.sentimentBadge, { backgroundColor: isDailyPos ? 'rgba(59,217,132,0.15)' : 'rgba(255,92,92,0.15)' }]}>
            <Text variant="body" color={isDailyPos ? colors.sentiment.bull_green : colors.sentiment.bear_red} weight="700" style={{ fontSize: 16 }}>
              {isDailyPos ? '+' : ''}{dailyChange} ({isDailyPos ? '+' : ''}{dailyChangePercent.toFixed(2)}%)
            </Text>
          </Box>
          <Text variant="body" color={colors.text.muted} style={{ marginLeft: spacing.sm, fontWeight: '600' }}>
            {t('summaryWidget.today')}
          </Text>
        </Box>
      </Box>

      {/* Segmented Hardware Display mimic using LinearGradient */}
      <View style={styles.hardwareWrap}>
        <LinearGradient
           colors={['rgba(30, 33, 43, 0.6)', 'rgba(21, 23, 28, 0.8)']}
           style={styles.hardwareInner}
        >
          <Box row justify="space-between">
            <Box flex={1}>
               <Text variant="caption" color={colors.text.muted} weight="700" style={{ marginBottom: 6, letterSpacing: 0.5 }}>{t('summaryWidget.invested')}</Text>
               <Text variant="h3" weight="700" style={{ letterSpacing: -0.5, fontSize: 17 }}>{totalInvested}</Text>
            </Box>
            <Box flex={1}>
               <Text variant="caption" color={colors.text.muted} weight="700" style={{ marginBottom: 6, letterSpacing: 0.5, textAlign: 'center' }}>{t('summaryWidget.unrealized')}</Text>
               <Text variant="h3" weight="700" color={isUnrealizedPos ? colors.sentiment.bull_green : colors.sentiment.bear_red} style={{ letterSpacing: -0.5, fontSize: 17, textAlign: 'center' }}>
                  {isUnrealizedPos ? '+' : ''}{unrealizedPnl}
               </Text>
            </Box>
            <Box flex={1} align="flex-end">
               <Text variant="caption" color={colors.text.muted} weight="700" style={{ marginBottom: 6, letterSpacing: 0.5 }}>{t('summaryWidget.realized')}</Text>
               <Text variant="h3" weight="700" style={{ letterSpacing: -0.5, fontSize: 17, color: colors.text.primary }}>
                  {realizedPnl}
               </Text>
            </Box>
          </Box>
        </LinearGradient>
      </View>
    </Box>
  );
};

const styles = StyleSheet.create({
  sentimentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hardwareWrap: {
    marginBottom: spacing.xxl,
    borderRadius: radius.md,
    padding: 1, // acts as border gradient
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hardwareInner: {
    borderRadius: radius.md - 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  }
});
