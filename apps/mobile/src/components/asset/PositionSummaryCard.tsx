import React from 'react';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { PremiumCard } from '../ui/PremiumCard';
import { colors, spacing } from '../../theme';
import { Wallet } from 'lucide-react-native';

interface PositionSummaryProps {
  quantity: string;
  avgCost: string;
  currentValue: string;
  unrealizedPnl: string;
  unrealizedPercent: number;
}

export const PositionSummaryCard: React.FC<PositionSummaryProps> = ({
  quantity, avgCost, currentValue, unrealizedPnl, unrealizedPercent
}) => {
  const isProfit = unrealizedPercent >= 0;
  const sentimentColor = isProfit ? colors.sentiment.bull_green : colors.sentiment.bear_red;
  const sign = isProfit ? '+' : '';

  return (
    <PremiumCard delay={100} style={{ marginVertical: spacing.lg }}>
      <Box row align="center" style={{ marginBottom: spacing.md }}>
        <Wallet color={colors.text.secondary} size={18} />
        <Text variant="h3" color={colors.text.secondary} style={{ marginLeft: spacing.sm }}>
          Your Position
        </Text>
      </Box>

      <Box row justify="space-between" style={{ marginBottom: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
        <Box>
            <Text variant="caption" color={colors.text.secondary} weight="700" style={{ marginBottom: 6, letterSpacing: 1 }}>HOLDINGS</Text>
            <Text variant="h1" weight="700" style={{ fontSize: 26, letterSpacing: -1 }}>{currentValue}</Text>
            <Text variant="caption" color={colors.text.muted} style={{ marginTop: 4, fontWeight: '500' }}>{quantity}</Text>
        </Box>
        <Box align="flex-end">
            <Text variant="caption" color={colors.text.secondary} weight="700" style={{ marginBottom: 6, letterSpacing: 1 }}>RETURN</Text>
            <Text variant="h2" weight="600" color={sentimentColor} style={{ fontSize: 22, letterSpacing: -0.5 }}>{sign}{unrealizedPnl}</Text>
            <Box style={{ backgroundColor: isProfit ? 'rgba(59,217,132,0.1)' : 'rgba(255,92,92,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 }}>
                <Text variant="caption" weight="700" color={sentimentColor}>{sign}{unrealizedPercent.toFixed(2)}%</Text>
            </Box>
        </Box>
      </Box>

      <Box row justify="space-between" align="center">
         <Text variant="caption" color={colors.text.muted} style={{ fontSize: 14 }}>Average Cost</Text>
         <Text variant="body" weight="600" style={{ letterSpacing: -0.5 }}>{avgCost}</Text>
      </Box>
    </PremiumCard>
  );
};
