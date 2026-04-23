import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TrendingDown, TrendingUp, Users } from 'lucide-react-native';

import { Text } from '../ui/Text';
import { fetchAssetSocial } from '../../api/social';
import type { AssetSocialStats } from '../../types/social';
import { colors, radius, spacing } from '../../theme';

interface Props {
  symbol: string;
  compact?: boolean;
}

/**
 * A live "social proof" chip. Fetches the per-asset weekly activity and shows
 * how many users added / bought / sold this week. Safe to drop into detail
 * pages or as a dashboard rail.
 */
export const AssetSocialProof: React.FC<Props> = ({ symbol, compact }) => {
  const [stats, setStats] = useState<AssetSocialStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAssetSocial(symbol);
        if (!cancelled) setStats(data);
      } catch {
        // ignored — non-critical widget
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!stats) return null;

  const tone =
    stats.net_momentum_pct >= 0
      ? colors.sentiment.bull_green
      : colors.sentiment.bear_red;

  const Trend = stats.net_momentum_pct >= 0 ? TrendingUp : TrendingDown;

  if (compact) {
    return (
      <Animated.View entering={FadeIn}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: radius.pill,
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: colors.border.soft,
          }}
        >
          <Users size={12} color={colors.text.muted} />
          <Text variant="caption" color={colors.text.secondary} mono>
            {stats.added_this_week.toLocaleString('tr-TR')} bu hafta
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn}>
      <View
        style={{
          backgroundColor: colors.background.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border.soft,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Users size={16} color={colors.text.secondary} />
            <Text variant="caption" color={colors.text.secondary} weight="700">
              SOSYAL NABIZ
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Trend size={14} color={tone} />
            <Text variant="caption" weight="700" color={tone} mono>
              {stats.net_momentum_pct >= 0 ? '+' : ''}
              {stats.net_momentum_pct.toFixed(1)}%
            </Text>
          </View>
        </View>
        <Text variant="body" color={colors.text.primary}>
          Bu hafta {stats.added_this_week.toLocaleString('tr-TR')} kullanıcı{' '}
          <Text weight="800">{symbol}</Text>&apos;ı portföyüne ekledi.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label="Alım" value={stats.bought_this_week} tone={colors.sentiment.bull_green} />
          <Stat label="Satım" value={stats.sold_this_week} tone={colors.sentiment.bear_red} />
          <Stat
            label="İzleyen"
            value={stats.in_watchlists}
            tone={colors.accent.premium_gold}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const Stat: React.FC<{ label: string; value: number; tone: string }> = ({
  label,
  value,
  tone,
}) => (
  <View style={{ flex: 1 }}>
    <Text variant="caption" color={colors.text.muted}>
      {label}
    </Text>
    <Text variant="body" weight="700" color={tone} mono>
      {value.toLocaleString('tr-TR')}
    </Text>
  </View>
);
