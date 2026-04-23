import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Box } from './Box';
import { Text } from './Text';
import { PriceText } from './PriceText';
import { QuoteMetaBadge } from './QuoteMetaBadge';
import { colors, radius, sentimentPalette, spacing } from '../../theme';
import { LineChart, TrendingUp, TrendingDown, Star } from 'lucide-react-native';

interface AssetRowProps {
  symbol: string;
  name: string;
  /** Formatted, display-ready price string. */
  price: string;
  /** Numeric copy of the price, used to trigger flash animations. */
  priceValue?: number;
  changePercent: number;
  dataBadge?: 'LIVE' | 'DERIVED' | 'STALE';
  meta?: string;
  icon?: React.ReactNode;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  onPress?: () => void;
  /** Data provider (for info popover) */
  source?: string;
  /** ISO timestamp of last update (for info popover) */
  updatedAt?: string;
  /** WebSocket connection state (renders "Cached" vs live) */
  isConnected?: boolean;
}

export const AssetRow: React.FC<AssetRowProps> = ({
  symbol,
  name,
  price,
  priceValue,
  changePercent,
  dataBadge,
  meta,
  icon,
  isFavorite,
  onFavoritePress,
  onPress,
  source,
  updatedAt,
  isConnected = true,
}) => {
  const palette = useMemo(() => sentimentPalette(changePercent), [changePercent]);
  // When no numeric value was passed we still want the row to be stable; parse
  // a fallback from the formatted price (strips all non-numeric characters).
  const effectivePriceValue = useMemo(() => {
    if (typeof priceValue === 'number' && Number.isFinite(priceValue)) return priceValue;
    const parsed = Number.parseFloat((price ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [priceValue, price]);
  const TrendIcon = palette.isPositive ? TrendingUp : TrendingDown;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <Box row justify="space-between" align="center" style={styles.container}>
        <Box row align="center" style={styles.leftSection}>
          <Box style={styles.iconBox} center>
            {icon || <LineChart color={colors.text.primary} size={20} />}
          </Box>
          <Box style={styles.infoSection}>
            <Box row align="center">
              <Text variant="h3">{symbol}</Text>
              {typeof isFavorite !== 'undefined' && (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    onFavoritePress?.();
                  }}
                  hitSlop={10}
                  style={{ marginLeft: 6, marginTop: 2 }}
                >
                  <Star
                    color={isFavorite ? colors.accent.premium_gold : colors.text.muted}
                    size={14}
                    fill={isFavorite ? colors.accent.premium_gold : 'transparent'}
                  />
                </Pressable>
              )}
            </Box>
            <Text variant="caption" color={colors.text.secondary}>
              {name}
            </Text>
            <Box row align="center" style={{ marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
              {/*
                Show the dataBadge only when it carries real information:
                STALE (truly old quote) or DERIVED (computed). A healthy
                LIVE quote doesn't need a loud pill — the provider chip is
                enough and the UI stays calm even when the WebSocket is
                temporarily offline.
              */}
              {dataBadge === 'STALE' ? (
                <Box style={[styles.badge, styles.badgeStale]}>
                  <Text
                    variant="caption"
                    weight="600"
                    color={colors.sentiment.bear_red}
                    style={{ fontSize: 10 }}
                  >
                    STALE
                  </Text>
                </Box>
              ) : dataBadge === 'DERIVED' ? (
                <Box style={[styles.badge, styles.badgeDerived]}>
                  <Text
                    variant="caption"
                    weight="600"
                    color={colors.text.muted}
                    style={{ fontSize: 10 }}
                  >
                    DERIVED
                  </Text>
                </Box>
              ) : null}
              {source || updatedAt ? (
                <QuoteMetaBadge
                  symbol={symbol}
                  source={source}
                  updatedAt={updatedAt}
                  isStale={dataBadge === 'STALE'}
                  isConnected={isConnected}
                />
              ) : null}
            </Box>
            {meta ? (
              <Text variant="caption" color={colors.text.muted} style={{ marginTop: 4 }} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </Box>
        </Box>

        <Box align="flex-end" style={styles.priceSection}>
          <PriceText
            value={effectivePriceValue}
            display={price}
            variant="body"
            weight="600"
            style={{ fontSize: 17 }}
          />
          {Number.isFinite(changePercent) && Math.abs(changePercent) >= 0.01 ? (
            <LinearGradient
              colors={palette.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.sentimentPill, { borderColor: palette.border }]}
            >
              <TrendIcon color={palette.text} size={12} style={{ marginRight: 4 }} />
              <Text variant="caption" color={palette.text} weight="700" mono>
                {palette.isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%
              </Text>
            </LinearGradient>
          ) : (
            <Box
              style={[
                styles.sentimentPill,
                {
                  borderColor: 'rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                },
              ]}
            >
              <Text variant="caption" color={colors.text.muted} weight="600" mono>
                —
              </Text>
            </Box>
          )}
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
  leftSection: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  infoSection: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },
  priceSection: {
    minWidth: 96,
    maxWidth: '46%',
    flexShrink: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
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
