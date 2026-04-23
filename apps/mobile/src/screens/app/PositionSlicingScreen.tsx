import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GitBranch } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchPositionSlicing } from '../../api/proTools';
import type { SlicingPlanView } from '../../types/proTools';
import { colors, radius, spacing } from '../../theme';

const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;

export const PositionSlicingScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [symbol, setSymbol] = useState<string>((route?.params?.symbol as string) ?? 'BTC');
  const [budget, setBudget] = useState<string>('1000');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USD');
  const [slices, setSlices] = useState<string>('4');
  const [cadence, setCadence] = useState<string>('7');
  const [data, setData] = useState<SlicingPlanView | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!symbol || Number(budget) <= 0) return;
    setLoading(true);
    try {
      setData(
        await fetchPositionSlicing({
          symbol,
          total_budget: Number(budget),
          currency,
          slice_count: Number(slices) || 4,
          cadence_days: Number(cadence) || 7,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [symbol, budget, currency, slices, cadence]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Parça Dilimleme"
        subtitle="Büyük pozisyonu zamanla yay"
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
          placeholder="Sembol"
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
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
            placeholder="Toplam bütçe"
            placeholderTextColor={colors.text.muted}
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
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  backgroundColor:
                    currency === c ? colors.accent.premium_gold : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    currency === c ? colors.accent.premium_gold : colors.border.soft,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  color={currency === c ? '#0B0B0F' : colors.text.primary}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.text.muted}>
              Dilim sayısı
            </Text>
            <TextInput
              value={slices}
              onChangeText={setSlices}
              keyboardType="numeric"
              style={{
                color: colors.text.primary,
                borderWidth: 1,
                borderColor: colors.border.soft,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                backgroundColor: colors.background.surface,
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.text.muted}>
              Gün aralığı
            </Text>
            <TextInput
              value={cadence}
              onChangeText={setCadence}
              keyboardType="numeric"
              style={{
                color: colors.text.primary,
                borderWidth: 1,
                borderColor: colors.border.soft,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                backgroundColor: colors.background.surface,
              }}
            />
          </View>
        </View>

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
                  gap: 4,
                }}
              >
                <Text variant="caption" color={colors.text.muted}>
                  Beklenen ortalama
                </Text>
                <Text variant="h2" weight="700">
                  {data.expected_avg_price.toFixed(4)} {data.currency}
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  {data.narrative}
                </Text>
              </View>
            </Animated.View>

            {data.slices.map((s, i) => (
              <Animated.View
                key={s.index}
                entering={FadeInUp.delay(i * 30).springify().damping(18)}
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
                  <GitBranch size={18} color={colors.accent.premium_gold} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" weight="700">
                      Dilim {s.index} · {s.scheduled_at}
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      {s.allocation.toFixed(2)} {data.currency} · tahmini{' '}
                      {s.projected_price.toFixed(4)}
                    </Text>
                  </View>
                  <Text variant="caption" color={colors.text.muted}>
                    {s.cumulative_units.toFixed(6)} birim
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
