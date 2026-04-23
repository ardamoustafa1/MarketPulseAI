import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OnchainAssetPulse } from '../../api/intelligence';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  assets: OnchainAssetPulse[];
}

const biasColor: Record<string, string> = {
  accumulation: colors.sentiment.bull_green,
  distribution: colors.sentiment.bear_red,
  neutral: colors.text.secondary,
};

export const OnchainPulseList: React.FC<Props> = ({ assets }) => {
  const { t } = useTranslation();
  if (assets.length === 0) return null;
  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
        {t('intelligence.onchainTitle')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
        {assets.map((asset) => {
          const color = biasColor[asset.net_bias];
          return (
            <Box key={asset.symbol} style={styles.card}>
              <Box row justify="space-between" align="center">
                <Text variant="body" weight="700">{asset.symbol}</Text>
                <Text variant="caption" color={color} weight="700">
                  {t(`intelligence.onchainBias.${asset.net_bias}`)}
                </Text>
              </Box>
              {asset.fear_greed_index !== null ? (
                <Text variant="caption" color={colors.text.muted} mono style={{ marginTop: 4 }}>
                  {t('intelligence.fearGreed', { value: asset.fear_greed_index.toFixed(0) })}
                </Text>
              ) : null}
              {asset.halving_days !== null ? (
                <Text variant="caption" color={colors.accent.premium_gold} style={{ marginTop: 4 }} weight="700">
                  {t('intelligence.halvingCountdown', { days: asset.halving_days })}
                </Text>
              ) : null}
              <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 8, lineHeight: 18 }}>
                {asset.summary}
              </Text>
            </Box>
          );
        })}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 260,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(24,26,32,0.55)',
    marginRight: 10,
  },
});
