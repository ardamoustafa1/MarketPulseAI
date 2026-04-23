import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BrainCircuit, Play, Trash2 } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import {
  deleteStrategyRule,
  fetchStrategyList,
  runStrategyPlayground,
} from '../../api/proTools';
import type {
  StrategyBacktestView,
  StrategyListView,
  StrategyRuleKind,
  StrategyRulePayload,
} from '../../types/proTools';
import { colors, radius, spacing } from '../../theme';

const KINDS: Array<{ key: StrategyRuleKind; label: string; hint: string }> = [
  {
    key: 'dca_on_drawdown',
    label: 'Düşüşte DCA',
    hint: 'Her X% düşüşte sabit miktarda al',
  },
  {
    key: 'dca_on_breakout',
    label: 'Kırılımda DCA',
    hint: 'Yeni zirvelerde sabit miktarda al',
  },
  {
    key: 'rebalance_drift',
    label: 'Rebalance sapma',
    hint: 'Ağırlık sapması eşiği aşıldıkça düzelt',
  },
  {
    key: 'momentum_ladder',
    label: 'Momentum merdiveni',
    hint: 'Momentum güçlüyken kademeli giriş',
  },
];

const CURRENCIES: Array<'TRY' | 'USD' | 'EUR'> = ['TRY', 'USD', 'EUR'];

export const StrategyPlaygroundScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<StrategyListView | null>(null);
  const [symbol, setSymbol] = useState('BTC');
  const [amount, setAmount] = useState('250');
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('USD');
  const [kind, setKind] = useState<StrategyRuleKind>('dca_on_drawdown');
  const [drawdown, setDrawdown] = useState('10');
  const [breakout, setBreakout] = useState('5');
  const [driftTolerance, setDriftTolerance] = useState('7');
  const [ladderSteps, setLadderSteps] = useState('4');
  const [lookback, setLookback] = useState('365');
  const [result, setResult] = useState<StrategyBacktestView | null>(null);
  const [loading, setLoading] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setList(await fetchStrategyList());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const run = useCallback(async () => {
    const payload: StrategyRulePayload = {
      kind,
      symbol: symbol.toUpperCase().trim(),
      installment_amount: Number(amount) || 0,
      currency,
      lookback_days: Number(lookback) || 365,
      drawdown_trigger_pct:
        kind === 'dca_on_drawdown' ? Number(drawdown) || 10 : null,
      breakout_trigger_pct:
        kind === 'dca_on_breakout' ? Number(breakout) || 5 : null,
      drift_tolerance_pct:
        kind === 'rebalance_drift' ? Number(driftTolerance) || 7 : null,
      ladder_steps:
        kind === 'momentum_ladder' ? Number(ladderSteps) || 4 : null,
    };

    setLoading(true);
    try {
      const bt = await runStrategyPlayground(payload);
      setResult(bt);
      await loadList();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Backtest başarısız.');
    } finally {
      setLoading(false);
    }
  }, [
    kind,
    symbol,
    amount,
    currency,
    lookback,
    drawdown,
    breakout,
    driftTolerance,
    ladderSteps,
    loadList,
  ]);

  const onDeleteRule = useCallback(
    async (ruleId: string) => {
      try {
        await deleteStrategyRule(ruleId);
        await loadList();
      } catch {
        /* noop */
      }
    },
    [loadList],
  );

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Strateji Playground"
        subtitle="Kural yaz — backtest al"
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
            backgroundColor: colors.background.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border.soft,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text variant="caption" color={colors.text.muted}>
            Strateji türü
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {KINDS.map((k) => (
              <Pressable
                key={k.key}
                onPress={() => setKind(k.key)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor:
                    kind === k.key ? colors.accent.premium_gold : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    kind === k.key
                      ? colors.accent.premium_gold
                      : colors.border.soft,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  color={kind === k.key ? '#0B0B0F' : colors.text.primary}
                >
                  {k.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text variant="caption" color={colors.text.secondary}>
            {KINDS.find((x) => x.key === kind)?.hint}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={symbol}
              onChangeText={(v) => setSymbol(v.toUpperCase())}
              placeholder="Sembol"
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
                backgroundColor: colors.background.base,
              }}
            />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Taksit"
              placeholderTextColor={colors.text.muted}
              style={{
                width: 110,
                color: colors.text.primary,
                borderWidth: 1,
                borderColor: colors.border.soft,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: 10,
                backgroundColor: colors.background.base,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 4 }}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor:
                    currency === c ? colors.accent.premium_gold : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    currency === c
                      ? colors.accent.premium_gold
                      : colors.border.soft,
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

          {kind === 'dca_on_drawdown' && (
            <LabeledInput
              label="Düşüş eşiği (%)"
              value={drawdown}
              onChange={setDrawdown}
            />
          )}
          {kind === 'dca_on_breakout' && (
            <LabeledInput
              label="Kırılım eşiği (%)"
              value={breakout}
              onChange={setBreakout}
            />
          )}
          {kind === 'rebalance_drift' && (
            <LabeledInput
              label="Drift toleransı (%)"
              value={driftTolerance}
              onChange={setDriftTolerance}
            />
          )}
          {kind === 'momentum_ladder' && (
            <LabeledInput
              label="Merdiven basamak sayısı"
              value={ladderSteps}
              onChange={setLadderSteps}
            />
          )}
          <LabeledInput
            label="Geriye dönük gün"
            value={lookback}
            onChange={setLookback}
          />

          <Pressable
            onPress={run}
            disabled={loading}
            style={{
              paddingVertical: 12,
              borderRadius: radius.md,
              backgroundColor: colors.accent.premium_gold,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing.sm,
              marginTop: spacing.xs,
            }}
          >
            <Play size={16} color="#0B0B0F" />
            <Text variant="caption" weight="700" color="#0B0B0F">
              {loading ? 'Backtest çalışıyor...' : 'Backtest çalıştır'}
            </Text>
          </Pressable>
        </View>

        {loading && !result && <ActivityIndicator color={colors.accent.premium_gold} />}

        {result && (
          <Animated.View entering={FadeInUp.springify().damping(18)}>
            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                gap: 6,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <BrainCircuit size={18} color={colors.accent.premium_gold} />
                <Text variant="body" weight="700">
                  Sonuç
                </Text>
              </View>
              <Stat
                label="Toplam yatırım"
                value={result.total_invested.toFixed(2)}
              />
              <Stat
                label="Son değer"
                value={result.final_value.toFixed(2)}
              />
              <Stat
                label="Getiri"
                value={`${result.total_return_pct.toFixed(2)}%`}
                tone={result.total_return_pct >= 0 ? 'pos' : 'neg'}
              />
              <Stat
                label="CAGR"
                value={`${result.cagr_pct.toFixed(2)}%`}
              />
              <Stat
                label="Maks. düşüş"
                value={`${result.max_drawdown_pct.toFixed(2)}%`}
                tone="neg"
              />
              <Stat
                label="Kazanan dönem"
                value={`${result.win_rate_pct.toFixed(1)}%`}
              />
              <Text
                variant="caption"
                color={colors.text.secondary}
                style={{ marginTop: 6 }}
              >
                {result.narrative}
              </Text>
            </View>
          </Animated.View>
        )}

        {list?.rules && list.rules.length > 0 && (
          <>
            <Text variant="caption" color={colors.text.muted}>
              Kayıtlı kurallar
            </Text>
            {list.rules.map((rule, i) => (
              <View
                key={`${rule.symbol}-${rule.kind}-${i}`}
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
                  <Text variant="caption" weight="700">
                    {rule.symbol} · {KINDS.find((k) => k.key === rule.kind)?.label ?? rule.kind}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    {rule.installment_amount} {rule.currency} ·{' '}
                    {rule.lookback_days}g
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDeleteRule((rule as any).id ?? '')}
                >
                  <Trash2 size={18} color={colors.text.muted} />
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Box>
  );
};

const LabeledInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <View style={{ gap: 4 }}>
    <Text variant="caption" color={colors.text.muted}>
      {label}
    </Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="numeric"
      style={{
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.soft,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        backgroundColor: colors.background.base,
      }}
    />
  </View>
);

const Stat: React.FC<{
  label: string;
  value: string;
  tone?: 'pos' | 'neg';
}> = ({ label, value, tone }) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <Text variant="caption" color={colors.text.secondary}>
      {label}
    </Text>
    <Text
      variant="caption"
      weight="700"
      color={tone === 'pos' ? '#3BD984' : tone === 'neg' ? '#FF5C5C' : colors.text.primary}
    >
      {value}
    </Text>
  </View>
);
