import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Activity } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchVolatilityCone } from '../../api/proTools';
import type { VolatilityConeView } from '../../types/proTools';
import { colors, radius, spacing } from '../../theme';

const WINDOWS = [14, 30, 60, 90];

const REGIME_COLOR: Record<string, string> = {
  calm: '#3BD984',
  normal: '#FFB800',
  elevated: '#FF8A5B',
  extreme: '#FF5C5C',
};

const REGIME_LABEL: Record<string, string> = {
  calm: 'Sakin',
  normal: 'Normal',
  elevated: 'Yüksek',
  extreme: 'Ekstrem',
};

export const VolatilityConeScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [symbol, setSymbol] = useState<string>((route?.params?.symbol as string) ?? 'BTC');
  const [win, setWin] = useState<number>(30);
  const [data, setData] = useState<VolatilityConeView | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      setData(await fetchVolatilityCone(symbol, win));
    } finally {
      setLoading(false);
    }
  }, [symbol, win]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxBandValue =
    data?.bands && data.bands.length > 0
      ? Math.max(...data.bands.map((b) => b.annualized_vol_pct))
      : 1;

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Volatilite Konisi"
        subtitle="Gerçekleşen vs tarihsel bant"
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

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {WINDOWS.map((w) => (
            <Pressable
              key={w}
              onPress={() => setWin(w)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor:
                  win === w ? colors.accent.premium_gold : 'transparent',
                borderWidth: 1,
                borderColor:
                  win === w ? colors.accent.premium_gold : colors.border.soft,
              }}
            >
              <Text
                variant="caption"
                weight="700"
                color={win === w ? '#0B0B0F' : colors.text.primary}
              >
                {w}g
              </Text>
            </Pressable>
          ))}
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
                  gap: spacing.xs,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <Activity size={18} color={REGIME_COLOR[data.regime]} />
                  <Text
                    variant="body"
                    weight="700"
                    color={REGIME_COLOR[data.regime]}
                  >
                    {REGIME_LABEL[data.regime]} rejim
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.text.muted}
                    style={{ marginLeft: 'auto' }}
                  >
                    {data.realized_vol_pct.toFixed(1)}% gerçekleşen
                  </Text>
                </View>
                <Text variant="caption" color={colors.text.secondary}>
                  {data.narrative}
                </Text>
              </View>
            </Animated.View>

            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                gap: 8,
              }}
            >
              <Text variant="caption" color={colors.text.muted}>
                Tarihsel percentiller ({data.window_days}g pencere)
              </Text>
              {data.bands.map((b) => {
                const pct = (b.annualized_vol_pct / maxBandValue) * 100;
                return (
                  <View key={b.percentile} style={{ gap: 4 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text variant="caption" color={colors.text.secondary}>
                        P{b.percentile}
                      </Text>
                      <Text variant="caption" color={colors.text.primary}>
                        {b.annualized_vol_pct.toFixed(1)}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: `${colors.accent.premium_gold}22`,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          height: 8,
                          backgroundColor: colors.accent.premium_gold,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Box>
  );
};
