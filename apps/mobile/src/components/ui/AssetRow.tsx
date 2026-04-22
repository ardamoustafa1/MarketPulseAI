import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Box } from './Box';
import { Text } from './Text';
import { colors, radius, spacing } from '../../theme';
import { LineChart, TrendingUp, TrendingDown, Star } from 'lucide-react-native';

interface AssetRowProps {
  symbol: string;
  name: string;
  price: string;
  changePercent: number;
  dataBadge?: 'LIVE' | 'DERIVED' | 'STALE';
  /** e.g. "Binance · last update" for transparency */
  meta?: string;
  icon?: React.ReactNode;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  onPress?: () => void;
}

export const AssetRow: React.FC<AssetRowProps> = ({
  symbol,
  name,
  price,
  changePercent,
  dataBadge,
  meta,
  icon,
  isFavorite,
  onFavoritePress,
  onPress,
}) => {
  const isPositive = changePercent >= 0;
  const sentimentColor = isPositive ? colors.sentiment.bull_green : colors.sentiment.bear_red;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <Box row justify="space-between" align="center" style={styles.container}>
        <Box row align="center">
          <Box style={styles.iconBox} center>
            {icon || <LineChart color={colors.text.primary} size={20} />}
          </Box>
          <Box style={{ marginLeft: spacing.md }}>
            <Box row align="center">
                <Text variant="h3">{symbol}</Text>
                {typeof isFavorite !== 'undefined' && (
                    <Pressable onPress={onFavoritePress} hitSlop={10} style={{ marginLeft: 6, marginTop: 2 }}>
                        <Star color={isFavorite ? colors.accent.premium_gold : colors.text.muted} size={14} fill={isFavorite ? colors.accent.premium_gold : 'transparent'} />
                    </Pressable>
                )}
            </Box>
            <Text variant="caption" color={colors.text.secondary}>{name}</Text>
            {dataBadge ? (
              <Box
                style={[
                  styles.badge,
                  dataBadge === 'LIVE'
                    ? styles.badgeLive
                    : dataBadge === 'DERIVED'
                      ? styles.badgeDerived
                      : styles.badgeStale,
                ]}
              >
                <Text
                  variant="caption"
                  weight="600"
                  color={dataBadge === 'STALE' ? colors.sentiment.bear_red : colors.text.secondary}
                  style={{ fontSize: 10 }}
                >
                  {dataBadge}
                </Text>
              </Box>
            ) : null}
            {meta ? (
              <Text variant="caption" color={colors.text.muted} style={{ marginTop: 4 }} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </Box>
        </Box>
        
        <Box align="flex-end">
          <Text variant="body" weight="600" style={{ fontSize: 17, letterSpacing: -0.5 }}>{price}</Text>
          <Box row align="center" style={[styles.sentimentPill, { backgroundColor: isPositive ? 'rgba(59,217,132,0.1)' : 'rgba(255,92,92,0.1)' }]}>
            {isPositive ? (
              <TrendingUp color={sentimentColor} size={12} style={{ marginRight: 4 }} />
            ) : (
              <TrendingDown color={sentimentColor} size={12} style={{ marginRight: 4 }} />
            )}
            <Text variant="caption" color={sentimentColor} weight="600">
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </Text>
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sentimentPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeLive: {
    backgroundColor: 'rgba(59,217,132,0.08)',
    borderColor: 'rgba(59,217,132,0.2)',
  },
  badgeDerived: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeStale: {
    backgroundColor: 'rgba(255,92,92,0.1)',
    borderColor: 'rgba(255,92,92,0.25)',
  },
});
