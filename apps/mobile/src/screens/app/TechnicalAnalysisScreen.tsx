import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Activity } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchTechnicalAnalysis } from '../../api/proTools';
import type { TechnicalAnalysisView, Timeframe } from '../../types/proTools';
import { colors, radius, spacing } from '../../theme';

const TIMEFRAMES: Timeframe[] = ['15m', '1h', '4h', '1d', '1w'];

const TONE_COLOR: Record<string, string> = {
  positive: '#3BD984',
  negative: '#FF5C5C',
  warning: '#E2A649',
  neutral: colors.text.secondary,
};

export const TechnicalAnalysisScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const initialSymbol = (route?.params?.symbol as string) ?? 'BTC';
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [tf, setTf] = useState<Timeframe>('1d');
  const [data, setData] = useState<TechnicalAnalysisView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (sym: string, timeframe: Timeframe) => {
      if (!sym) return;
      setLoading(true);
      setError(null);
      try {
        const view = await fetchTechnicalAnalysis(sym, timeframe);
        setData(view);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Veri alınamadı');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(symbol, tf);
  }, [symbol, tf, load]);

  const toneColor =
    data?.summary_tone === 'bullish'
      ? '#3BD984'
      : data?.summary_tone === 'bearish'
        ? '#FF5C5C'
        : colors.text.secondary;

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Teknik Analiz"
        subtitle="RSI · MACD · BB · Fib"
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <TextInput
            value={symbol}
            onChangeText={(v) => setSymbol(v.toUpperCase().trim())}
            placeholder="Sembol (BTC, XAU, USDTRY)"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="characters"
            style={{
              flex: 1,
              color: colors.text.primary,
              borderWidth: 1,
              borderColor: colors.border.soft,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
              backgroundColor: colors.background.surface,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.xs,
            flexWrap: 'wrap',
          }}
        >
          {TIMEFRAMES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTf(t)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor:
                  tf === t ? colors.accent.premium_gold : colors.background.surface,
                borderWidth: 1,
                borderColor:
                  tf === t ? colors.accent.premium_gold : colors.border.soft,
              }}
            >
              <Text
                variant="caption"
                weight="700"
                color={tf === t ? '#0B0B0F' : colors.text.primary}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && !data && <ActivityIndicator color={colors.accent.premium_gold} />}
        {error && (
          <Text color={colors.sentiment.bear_red} variant="caption">
            {error}
          </Text>
        )}

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
                  gap: spacing.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Activity size={18} color={toneColor} />
                  <Text variant="body" weight="700" color={toneColor}>
                    {data.summary_tone.toUpperCase()}
                  </Text>
                  <Text variant="caption" color={colors.text.muted}>
                    · Son {data.last_price.toFixed(4)}
                  </Text>
                </View>
                <Text variant="caption" color={colors.text.secondary}>
                  {data.ai_takeaway}
                </Text>
              </View>
            </Animated.View>

            {data.indicators.map((ind, i) => (
              <Animated.View
                key={ind.name}
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
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.text.muted}>
                      {ind.label}
                    </Text>
                    {ind.caption && (
                      <Text
                        variant="caption"
                        color={colors.text.secondary}
                        style={{ marginTop: 2 }}
                      >
                        {ind.caption}
                      </Text>
                    )}
                  </View>
                  <Text
                    variant="body"
                    weight="700"
                    color={TONE_COLOR[ind.tone] ?? colors.text.primary}
                  >
                    {ind.value.toFixed(2)}
                  </Text>
                </View>
              </Animated.View>
            ))}

            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                gap: 4,
              }}
            >
              <Text variant="caption" color={colors.text.muted}>
                Bollinger Bandı
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                Üst {data.bollinger.upper.toFixed(4)} · Orta{' '}
                {data.bollinger.middle.toFixed(4)} · Alt{' '}
                {data.bollinger.lower.toFixed(4)}
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                Bant genişliği {data.bollinger.bandwidth_pct.toFixed(2)}%
              </Text>
            </View>

            {data.fibonacci.length > 0 && (
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
                  Fibonacci Seviyeleri
                </Text>
                {data.fibonacci.map((f) => (
                  <View
                    key={f.label}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text variant="caption" color={colors.text.primary}>
                      {f.label}
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      {f.value.toFixed(4)}{' '}
                      <Text
                        variant="caption"
                        color={
                          f.distance_pct >= 0
                            ? '#3BD984'
                            : '#FF5C5C'
                        }
                      >
                        ({f.distance_pct >= 0 ? '+' : ''}
                        {f.distance_pct.toFixed(2)}%)
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Box>
  );
};
