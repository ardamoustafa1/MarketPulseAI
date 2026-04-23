import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Shuffle, TrendingUp } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchSpreadView } from '../../api/proTools';
import type { SpreadView } from '../../types/proTools';
import { colors, radius, spacing } from '../../theme';

const TONE_COLOR: Record<string, string> = {
  positive: '#3BD984',
  warning: '#FF5C5C',
  neutral: colors.text.secondary,
};

export const SpreadDetectorScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [symbol, setSymbol] = useState<string>((route?.params?.symbol as string) ?? 'BTC');
  const [data, setData] = useState<SpreadView | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const view = await fetchSpreadView(symbol);
      setData(view);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Spread Dedektörü"
        subtitle="Borsa arası arbitraj radarı"
        onBack={() => navigation?.goBack()}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <TextInput
          value={symbol}
          onChangeText={(v) => setSymbol(v.toUpperCase().trim())}
          placeholder="Sembol (BTC / USDTRY)"
          placeholderTextColor={colors.text.muted}
          autoCapitalize="characters"
          style={{
            color: colors.text.primary,
            borderWidth: 1,
            borderColor: colors.border.soft,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 10,
            backgroundColor: colors.background.surface,
          }}
        />

        {loading && !data && <ActivityIndicator color={colors.accent.premium_gold} />}

        {data && (
          <>
            <Animated.View entering={FadeInUp.springify().damping(18)}>
              <View
                style={{
                  backgroundColor: colors.background.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border.soft,
                  padding: spacing.md,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <TrendingUp size={18} color={colors.accent.premium_gold} />
                  <Text variant="body" weight="700" style={{ flex: 1 }}>
                    En iyi fırsat
                  </Text>
                  <Text
                    variant="body"
                    weight="700"
                    color={
                      data.best_spread_pct >= 0.3
                        ? '#3BD984'
                        : colors.text.primary
                    }
                  >
                    {data.best_spread_pct >= 0 ? '+' : ''}
                    {data.best_spread_pct.toFixed(3)}%
                  </Text>
                </View>
              </View>
            </Animated.View>

            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                gap: 6,
              }}
            >
              <Text variant="caption" color={colors.text.muted}>
                Borsa kotasyonları
              </Text>
              {data.quotes.map((q) => (
                <View
                  key={q.exchange}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}
                >
                  <Text variant="caption" color={colors.text.primary}>
                    {q.exchange.toUpperCase()}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    bid {q.bid.toFixed(4)} · ask {q.ask.toFixed(4)}
                  </Text>
                </View>
              ))}
            </View>

            <Text variant="caption" color={colors.text.muted}>
              Fırsatlar (boğa yönü)
            </Text>
            {data.opportunities.map((op, i) => (
              <Animated.View
                key={`${op.buy_exchange}-${op.sell_exchange}-${i}`}
                entering={FadeInUp.delay(i * 40).springify().damping(18)}
              >
                <View
                  style={{
                    backgroundColor: colors.background.surface,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border.soft,
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <Shuffle size={18} color={TONE_COLOR[op.tone]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" weight="700">
                      {op.buy_exchange.toUpperCase()} →{' '}
                      {op.sell_exchange.toUpperCase()}
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      Al {op.buy_price.toFixed(4)} · Sat{' '}
                      {op.sell_price.toFixed(4)}
                    </Text>
                  </View>
                  <Text
                    variant="caption"
                    weight="700"
                    color={TONE_COLOR[op.tone]}
                  >
                    {op.spread_pct >= 0 ? '+' : ''}
                    {op.spread_pct.toFixed(3)}%
                  </Text>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </Box>
  );
};
