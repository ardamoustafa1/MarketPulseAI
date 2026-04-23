import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { ShellCard } from '../../components/deep-card/primitives';
import { fetchTaxLots } from '../../api/portfolioPowers';
import type { TaxLotReport, TaxMethod } from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

export const PortfolioTaxLotsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<TaxMethod>('fifo');
  const [data, setData] = useState<TaxLotReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (m: TaxMethod) => {
    setLoading(true);
    try {
      setData(await fetchTaxLots(m));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(method);
  }, [method, load]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Vergi Lot Takibi"
        subtitle="FIFO / LIFO — açık lotlar ve realize kar-zarar"
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
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['fifo', 'lifo'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={({ pressed }) => [
                {
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: radius.pill,
                  backgroundColor:
                    method === m ? colors.accent.primary_blue : colors.background.surface,
                  borderWidth: 1,
                  borderColor: method === m ? colors.accent.primary_blue : colors.border.soft,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                variant="body"
                weight="700"
                color={method === m ? '#fff' : colors.text.primary}
              >
                {m.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && (
          <ShellCard>
            <ActivityIndicator color={colors.accent.primary_blue} />
          </ShellCard>
        )}

        {data && (
          <>
            <ShellCard>
              <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                <StatCol label="Açık maliyet" value={`$${data.total_open_cost.toLocaleString()}`} />
                <StatCol
                  label="Realize kar/zarar"
                  value={`${data.total_realized_pnl >= 0 ? '+' : ''}$${data.total_realized_pnl.toLocaleString()}`}
                  tone={data.total_realized_pnl >= 0 ? 'positive' : 'negative'}
                />
                <StatCol
                  label="Gerçekleşmemiş P/L"
                  value={`${data.total_unrealized_pnl >= 0 ? '+' : ''}$${data.total_unrealized_pnl.toLocaleString()}`}
                  tone={data.total_unrealized_pnl >= 0 ? 'positive' : 'negative'}
                />
              </View>
            </ShellCard>

            <ShellCard>
              <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
                Açık Lotlar ({data.open_lots.length})
              </Text>
              {data.open_lots.length === 0 ? (
                <Text variant="caption" color={colors.text.secondary}>
                  Açık lot yok.
                </Text>
              ) : (
                data.open_lots.map((lot, i) => (
                  <View
                    key={`${lot.symbol}-${i}`}
                    style={{
                      paddingVertical: spacing.sm,
                      borderBottomColor: colors.border.soft,
                      borderBottomWidth: 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text variant="body" weight="700">
                        {lot.symbol}
                      </Text>
                      <Text variant="body" mono>
                        {lot.quantity.toFixed(6)}
                      </Text>
                    </View>
                    <Text variant="caption" color={colors.text.secondary} mono>
                      {lot.acquired_at.slice(0, 10)} · {lot.age_days} gün · birim maliyet $
                      {lot.cost_per_unit.toFixed(2)}
                    </Text>
                    {lot.unrealized_pnl != null && (
                      <Text
                        variant="caption"
                        mono
                        color={
                          lot.unrealized_pnl >= 0
                            ? colors.sentiment.bull_green
                            : colors.sentiment.bear_red
                        }
                      >
                        P/L {lot.unrealized_pnl >= 0 ? '+' : ''}${lot.unrealized_pnl.toFixed(2)} (
                        {lot.unrealized_pnl_pct?.toFixed(1)}%)
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ShellCard>

            <ShellCard>
              <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
                Realize Olaylar ({data.realized_events.length})
              </Text>
              {data.realized_events.length === 0 ? (
                <Text variant="caption" color={colors.text.secondary}>
                  Henüz satış yok.
                </Text>
              ) : (
                data.realized_events.map((e, i) => (
                  <View
                    key={`e-${i}`}
                    style={{
                      paddingVertical: spacing.sm,
                      borderBottomColor: colors.border.soft,
                      borderBottomWidth: 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text variant="body" weight="700">
                        {e.symbol}
                      </Text>
                      <Text
                        variant="body"
                        weight="700"
                        mono
                        color={
                          e.realized_pnl >= 0
                            ? colors.sentiment.bull_green
                            : colors.sentiment.bear_red
                        }
                      >
                        {e.realized_pnl >= 0 ? '+' : ''}${e.realized_pnl.toFixed(2)}
                      </Text>
                    </View>
                    <Text variant="caption" color={colors.text.secondary} mono>
                      {e.sold_at.slice(0, 10)} · {e.quantity.toFixed(6)} adet · gelir $
                      {e.proceeds.toFixed(2)} · maliyet ${e.cost_basis.toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </ShellCard>
          </>
        )}
      </ScrollView>
    </Box>
  );
};

const StatCol: React.FC<{ label: string; value: string; tone?: 'positive' | 'negative' }> = ({
  label,
  value,
  tone,
}) => (
  <View style={{ minWidth: 110 }}>
    <Text variant="caption" color={colors.text.secondary}>
      {label}
    </Text>
    <Text
      variant="body"
      weight="700"
      mono
      style={{
        color:
          tone === 'positive'
            ? colors.sentiment.bull_green
            : tone === 'negative'
              ? colors.sentiment.bear_red
              : colors.text.primary,
      }}
    >
      {value}
    </Text>
  </View>
);
