import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { ShellCard, SubRow } from '../../components/deep-card/primitives';
import { fetchDenomination } from '../../api/portfolioPowers';
import type { Denomination, DenominationResponse } from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

const OPTIONS: { code: Denomination; label: string }[] = [
  { code: 'TRY', label: '₺ TRY' },
  { code: 'USD', label: '$ USD' },
  { code: 'EUR', label: '€ EUR' },
  { code: 'BTC', label: '₿ BTC' },
  { code: 'XAU_GRAM', label: 'gr ALTIN' },
];

const formatDenom = (val: number, denom: Denomination): string => {
  if (denom === 'BTC') return `${val.toFixed(8)} ₿`;
  if (denom === 'XAU_GRAM') return `${val.toFixed(3)} gr`;
  const prefix = denom === 'TRY' ? '₺' : denom === 'USD' ? '$' : '€';
  return `${prefix}${val.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
};

export const PortfolioDenominationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<Denomination>('TRY');
  const [data, setData] = useState<DenominationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (denom: Denomination) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDenomination(denom);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(active);
  }, [active, load]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Çoklu Denominasyon"
        subtitle="Portföyünü farklı birimlerden gör"
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {OPTIONS.map((opt) => {
            const selected = opt.code === active;
            return (
              <Pressable
                key={opt.code}
                onPress={() => setActive(opt.code)}
                style={({ pressed }) => [
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: radius.pill,
                    backgroundColor: selected
                      ? colors.accent.primary_blue
                      : colors.background.surface,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent.primary_blue : colors.border.soft,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  variant="body"
                  weight="600"
                  color={selected ? '#fff' : colors.text.primary}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && (
          <ShellCard>
            <ActivityIndicator size="small" color={colors.accent.primary_blue} />
          </ShellCard>
        )}

        {error && (
          <ShellCard>
            <Text color={colors.sentiment.bear_red}>Yüklenemedi: {error}</Text>
          </ShellCard>
        )}

        {data && (
          <>
            <ShellCard>
              <Text variant="caption" color={colors.text.secondary}>
                Toplam Değer
              </Text>
              <Text variant="h1" weight="700" style={{ marginTop: 4 }} mono>
                {formatDenom(data.total_value, data.denomination)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  marginTop: spacing.sm,
                  flexWrap: 'wrap',
                }}
              >
                <Text
                  variant="caption"
                  mono
                  color={
                    data.unrealized_pnl >= 0
                      ? colors.sentiment.bull_green
                      : colors.sentiment.bear_red
                  }
                >
                  P/L {formatDenom(data.unrealized_pnl, data.denomination)} (
                  {data.unrealized_pnl_pct >= 0 ? '+' : ''}
                  {data.unrealized_pnl_pct.toFixed(2)}%)
                </Text>
                {data.month_to_date_change_pct != null && (
                  <Text
                    variant="caption"
                    mono
                    color={
                      data.month_to_date_change_pct >= 0
                        ? colors.sentiment.bull_green
                        : colors.sentiment.bear_red
                    }
                  >
                    MTD {data.month_to_date_change_pct >= 0 ? '+' : ''}
                    {data.month_to_date_change_pct.toFixed(2)}%
                  </Text>
                )}
              </View>
            </ShellCard>

            <ShellCard>
              <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
                Pozisyonlar
              </Text>
              {data.positions.length === 0 ? (
                <Text variant="caption" color={colors.text.secondary}>
                  Pozisyon yok.
                </Text>
              ) : (
                data.positions.map((p) => (
                  <SubRow
                    key={p.symbol}
                    left={p.symbol}
                    caption={`${p.quantity.toFixed(6)} adet`}
                    right={formatDenom(p.current_value, data.denomination)}
                    tone={
                      p.unrealized_pnl >= 0
                        ? 'positive'
                        : p.unrealized_pnl < 0
                          ? 'negative'
                          : 'neutral'
                    }
                  />
                ))
              )}
            </ShellCard>
          </>
        )}
      </ScrollView>
    </Box>
  );
};
