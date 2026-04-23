import React from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NewsImpactItem } from '../../api/intelligence';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  items: NewsImpactItem[];
}

const severityColor: Record<string, string> = {
  positive: colors.sentiment.bull_green,
  warning: '#FFCC4D',
  neutral: colors.text.secondary,
  negative: colors.sentiment.bear_red,
};

export const NewsImpactList: React.FC<Props> = ({ items }) => {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
        {t('intelligence.newsImpactTitle')}
      </Text>
      {items.map((item) => {
        const color = severityColor[item.severity] ?? colors.text.secondary;
        return (
          <Pressable
            key={item.id}
            onPress={() => item.link && Linking.openURL(item.link)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
          >
            <Box row justify="space-between" align="center" style={{ marginBottom: 6 }}>
              <Text variant="caption" color={color} weight="700" style={{ letterSpacing: 0.5 }}>
                {item.source}
              </Text>
              <Text variant="caption" color={colors.text.muted}>{item.tags.slice(0, 2).join(' · ')}</Text>
            </Box>
            <Text variant="body" weight="600" style={{ lineHeight: 22 }}>
              {item.title}
            </Text>
            <Box row style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
              <Badge label={t('intelligence.impactValue', { amount: formatImpact(item.portfolio_impact, item.impact_currency) })} tone={item.portfolio_impact >= 0 ? 'positive' : 'negative'} />
              {item.assets.slice(0, 4).map((asset) => (
                <Badge
                  key={`${item.id}-${asset.symbol}`}
                  label={`${asset.symbol} ${asset.expected_move_pct >= 0 ? '+' : ''}${asset.expected_move_pct.toFixed(2)}%`}
                  tone={asset.direction === 'up' ? 'positive' : 'negative'}
                />
              ))}
            </Box>
            {item.summary ? (
              <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 6, lineHeight: 18 }}>
                {item.summary}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </Box>
  );
};

const Badge: React.FC<{ label: string; tone?: 'positive' | 'negative' | 'neutral' }> = ({ label, tone = 'neutral' }) => {
  const color =
    tone === 'positive' ? colors.sentiment.bull_green : tone === 'negative' ? colors.sentiment.bear_red : colors.text.secondary;
  return (
    <Box style={[styles.badge, { borderColor: `${color}55` }]}>
      <Text variant="caption" color={color} weight="700" mono style={{ fontSize: 11 }}>{label}</Text>
    </Box>
  );
};

function formatImpact(value: number, currency: 'TRY' | 'USD'): string {
  const sign = value >= 0 ? '+' : '';
  const prefix = currency === 'TRY' ? '₺' : '$';
  return `${sign}${prefix}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(24,26,32,0.55)',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
