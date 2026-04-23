import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2 } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { ShellCard } from '../../components/deep-card/primitives';
import {
  fetchRebalancePlan,
  updateRebalanceTarget,
} from '../../api/portfolioPowers';
import type { RebalancePlan } from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

interface EditRow {
  symbol: string;
  weight: string;
}

const toneForAction = (a: string) =>
  a === 'buy' ? colors.sentiment.bull_green : a === 'sell' ? colors.sentiment.bear_red : colors.text.secondary;

export const PortfolioRebalancerScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [rows, setRows] = useState<EditRow[]>([
    { symbol: 'XAUTRY', weight: '40' },
    { symbol: 'BTCUSDT', weight: '30' },
    { symbol: 'USDTRY', weight: '20' },
    { symbol: 'AAPL', weight: '10' },
  ]);
  const [tol, setTol] = useState('5');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRebalancePlan();
      setPlan(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const target_weights: Record<string, number> = {};
      rows.forEach((r) => {
        const sym = r.symbol.trim().toUpperCase();
        const w = parseFloat(r.weight);
        if (sym && Number.isFinite(w)) target_weights[sym] = w;
      });
      const res = await updateRebalanceTarget({
        target_weights,
        drift_tolerance_pct: parseFloat(tol) || 5,
      });
      setPlan(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const sumWeights = rows.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Akıllı Rebalancer"
        subtitle="Hedef ağırlıklar ve dengeleme planı"
        onBack={() => navigation?.goBack()}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <ShellCard>
          <Text variant="h3" weight="700">
            Hedef Ağırlıklar
          </Text>
          <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 2 }}>
            Toplam: {sumWeights.toFixed(1)}% (100 olmalı)
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {rows.map((r, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <TextInput
                  value={r.symbol}
                  onChangeText={(v) => {
                    const nr = [...rows];
                    nr[i] = { ...nr[i], symbol: v.toUpperCase() };
                    setRows(nr);
                  }}
                  placeholder="Sembol"
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize="characters"
                  style={{
                    flex: 2,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: radius.md,
                    backgroundColor: colors.background.elevated,
                    borderWidth: 1,
                    borderColor: colors.border.soft,
                    color: colors.text.primary,
                  }}
                />
                <TextInput
                  value={r.weight}
                  onChangeText={(v) => {
                    const nr = [...rows];
                    nr[i] = { ...nr[i], weight: v };
                    setRows(nr);
                  }}
                  placeholder="%"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: radius.md,
                    backgroundColor: colors.background.elevated,
                    borderWidth: 1,
                    borderColor: colors.border.soft,
                    color: colors.text.primary,
                    textAlign: 'center',
                  }}
                />
                <Pressable
                  onPress={() => setRows(rows.filter((_, j) => j !== i))}
                  hitSlop={12}
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
                >
                  <Trash2 color={colors.text.muted} size={18} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => setRows([...rows, { symbol: '', weight: '0' }])}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Plus color={colors.accent.primary_blue} size={16} />
              <Text variant="caption" weight="600" color={colors.accent.primary_blue}>
                Sembol ekle
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              marginTop: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Text variant="body" style={{ flex: 1 }}>
              Drift toleransı (%)
            </Text>
            <TextInput
              value={tol}
              onChangeText={setTol}
              keyboardType="decimal-pad"
              style={{
                width: 80,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: radius.md,
                backgroundColor: colors.background.elevated,
                borderWidth: 1,
                borderColor: colors.border.soft,
                color: colors.text.primary,
                textAlign: 'center',
              }}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              {
                marginTop: spacing.md,
                backgroundColor: colors.accent.primary_blue,
                borderRadius: radius.md,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : saving ? 0.6 : 1,
              },
            ]}
          >
            <Text variant="body" weight="700" color="#fff">
              {saving ? 'Kaydediliyor…' : 'Hedefi kaydet & plan üret'}
            </Text>
          </Pressable>
        </ShellCard>

        {loading && (
          <ShellCard>
            <ActivityIndicator color={colors.accent.primary_blue} />
          </ShellCard>
        )}

        {error && (
          <ShellCard>
            <Text color={colors.sentiment.bear_red}>{error}</Text>
          </ShellCard>
        )}

        {plan && (
          <ShellCard>
            <Text variant="h3" weight="700">
              Dengeleme Planı
            </Text>
            <Text
              variant="caption"
              color={colors.text.secondary}
              style={{ marginTop: 2, marginBottom: spacing.sm }}
            >
              {plan.narrative}
            </Text>
            {plan.entries.length === 0 ? (
              <Text variant="caption" color={colors.text.secondary}>
                Aksiyon yok — portföy dengede.
              </Text>
            ) : (
              plan.entries.map((e) => (
                <View
                  key={e.symbol}
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
                      style={{ color: toneForAction(e.action) }}
                    >
                      {e.action === 'buy'
                        ? 'AL'
                        : e.action === 'sell'
                          ? 'SAT'
                          : 'TUT'}
                    </Text>
                  </View>
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    mono
                    style={{ marginTop: 2 }}
                  >
                    Hedef %{e.target_pct.toFixed(1)} · Şu an %{e.current_pct.toFixed(1)} ·
                    Drift {e.drift_pct >= 0 ? '+' : ''}
                    {e.drift_pct.toFixed(1)}%
                  </Text>
                  {e.action !== 'hold' && (
                    <Text
                      variant="caption"
                      mono
                      color={colors.text.primary}
                      style={{ marginTop: 2 }}
                    >
                      {e.trade_quantity.toFixed(6)} adet · ${Math.abs(e.trade_usd).toFixed(0)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ShellCard>
        )}
      </ScrollView>
    </Box>
  );
};
