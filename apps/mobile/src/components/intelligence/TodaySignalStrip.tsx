import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight } from 'lucide-react-native';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { AssetSignal } from '../../api/intelligence';
import { colors, radius, spacing } from '../../theme';

interface Props {
  assets: AssetSignal[];
  limit?: number;
}

const ACTION_COLOR: Record<string, string> = {
  BUY: colors.sentiment.bull_green,
  SELL: colors.sentiment.bear_red,
  HOLD: colors.text.secondary,
};

const actionLabel: Record<string, string> = {
  BUY: 'AL',
  SELL: 'SAT',
  HOLD: 'BEKLE',
};

export const TodaySignalStrip: React.FC<Props> = ({ assets, limit = 12 }) => {
  const { t } = useTranslation();
  const ranked = [...assets]
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, limit);

  if (ranked.length === 0) return null;

  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Box row justify="space-between" align="center" style={{ marginBottom: spacing.sm }}>
        <Text variant="h3" weight="700">{t('intelligence.todayTitle')}</Text>
        <Text variant="caption" color={colors.text.muted}>{t('intelligence.todaySubtitle')}</Text>
      </Box>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
        {ranked.map((asset) => {
          const color = ACTION_COLOR[asset.action] ?? colors.text.secondary;
          const gradient: [string, string] =
            asset.action === 'BUY'
              ? ['rgba(59,217,132,0.20)', 'rgba(59,217,132,0.02)']
              : asset.action === 'SELL'
              ? ['rgba(255,92,92,0.22)', 'rgba(255,92,92,0.02)']
              : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)'];
          return (
            <View key={asset.symbol} style={styles.card}>
              <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Box style={{ zIndex: 1 }}>
                <Box row justify="space-between" align="center">
                  <Text variant="caption" weight="700">{asset.symbol}</Text>
                  <Text variant="caption" weight="700" color={color}>{actionLabel[asset.action] ?? asset.action}</Text>
                </Box>
                <Text variant="h3" weight="700" mono style={{ marginTop: 4 }}>{asset.score.toFixed(2)}</Text>
                <Box row align="center" style={{ marginTop: 4 }}>
                  <ArrowUpRight color={color} size={12} style={{ marginRight: 3 }} />
                  <Text variant="caption" color={colors.text.muted}>
                    {t('intelligence.scoreConfidence', { value: Math.round(asset.confidence * 100) })}
                  </Text>
                </Box>
                {asset.historical_hit_rate !== null && asset.historical_hit_rate !== undefined ? (
                  <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                    {t('intelligence.historicalHit', { value: Math.round(asset.historical_hit_rate * 100) })}
                  </Text>
                ) : null}
              </Box>
            </View>
          );
        })}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 110,
    borderRadius: radius.lg,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(24,26,32,0.65)',
    justifyContent: 'space-between',
  },
});
