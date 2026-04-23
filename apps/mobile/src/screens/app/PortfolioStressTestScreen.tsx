import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { Badge, ShellCard } from '../../components/deep-card/primitives';
import { runStressTest } from '../../api/portfolioPowers';
import type { StressScenarioId, StressTestResponse } from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

const SCENARIO_LABELS: Record<StressScenarioId, string> = {
  gfc_2008: '2008 Küresel Kriz',
  covid_2020: 'COVID-19 Paniği (2020)',
  fed_hike_2022: 'FED Sıkılaşma (2022)',
  dot_com_2000: 'Dot-com Patlaması (2000)',
  try_crisis_2018: 'TL Krizi (2018)',
};

export const PortfolioStressTestScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<StressTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<StressScenarioId>>(
    new Set(['gfc_2008', 'covid_2020', 'fed_hike_2022']),
  );

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await runStressTest(Array.from(selected));
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    run();
  }, [run]);

  const toggle = (id: StressScenarioId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Stres Testi"
        subtitle="Tarihsel krizler bugün patlasa?"
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
        <ShellCard>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
            Senaryolar
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(SCENARIO_LABELS) as StressScenarioId[]).map((id) => {
              const on = selected.has(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => toggle(id)}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: radius.pill,
                      backgroundColor: on ? colors.accent.primary_blue : colors.background.elevated,
                      borderWidth: 1,
                      borderColor: on ? colors.accent.primary_blue : colors.border.soft,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    color={on ? '#fff' : colors.text.primary}
                  >
                    {SCENARIO_LABELS[id]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={run}
            disabled={loading || selected.size === 0}
            style={({ pressed }) => [
              {
                marginTop: spacing.md,
                backgroundColor: colors.accent.primary_blue,
                borderRadius: radius.md,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : loading ? 0.6 : 1,
              },
            ]}
          >
            <Text variant="body" weight="700" color="#fff">
              {loading ? 'Çalıştırılıyor…' : 'Stres testini çalıştır'}
            </Text>
          </Pressable>
        </ShellCard>

        {loading && (
          <ShellCard>
            <ActivityIndicator color={colors.accent.primary_blue} />
          </ShellCard>
        )}

        {data &&
          data.results.map((r) => {
            const neg = r.portfolio_change_pct < 0;
            return (
              <ShellCard key={r.scenario_id}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" weight="700">
                      {r.scenario_label}
                    </Text>
                  </View>
                  <Badge
                    text={`${r.portfolio_change_pct >= 0 ? '+' : ''}${r.portfolio_change_pct.toFixed(1)}%`}
                    tone={neg ? 'negative' : 'positive'}
                  />
                </View>
                <Text
                  variant="caption"
                  color={colors.text.secondary}
                  style={{ marginTop: 4 }}
                >
                  {r.narrative}
                </Text>

                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                  <View>
                    <Text variant="caption" color={colors.text.secondary}>
                      Önce
                    </Text>
                    <Text variant="body" mono>
                      ${r.portfolio_value_usd_before.toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text variant="caption" color={colors.text.secondary}>
                      Sonra
                    </Text>
                    <Text
                      variant="body"
                      mono
                      color={neg ? colors.sentiment.bear_red : colors.sentiment.bull_green}
                    >
                      ${r.portfolio_value_usd_after.toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text variant="caption" color={colors.text.secondary}>
                      Max drawdown
                    </Text>
                    <Text variant="body" mono color={colors.sentiment.bear_red}>
                      {r.max_drawdown_pct.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {r.worst_impact && (
                  <Text
                    variant="caption"
                    color={colors.sentiment.bear_red}
                    mono
                    style={{ marginTop: spacing.sm }}
                  >
                    En kötü etki: {r.worst_impact.symbol} · ${r.worst_impact.value_change_usd.toFixed(0)} ·{' '}
                    {r.worst_impact.shock_pct.toFixed(1)}%
                  </Text>
                )}
                {r.best_impact && (
                  <Text
                    variant="caption"
                    color={colors.sentiment.bull_green}
                    mono
                    style={{ marginTop: 2 }}
                  >
                    En iyi etki: {r.best_impact.symbol} · +${r.best_impact.value_change_usd.toFixed(0)} ·{' '}
                    {r.best_impact.shock_pct.toFixed(1)}%
                  </Text>
                )}
              </ShellCard>
            );
          })}
      </ScrollView>
    </Box>
  );
};
