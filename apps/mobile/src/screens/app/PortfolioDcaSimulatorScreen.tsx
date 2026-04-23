import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { ShellCard } from '../../components/deep-card/primitives';
import { runDcaSimulation } from '../../api/portfolioPowers';
import type { DcaSimulationResponse, Denomination } from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

const CURRENCIES: Denomination[] = ['TRY', 'USD', 'EUR', 'BTC', 'XAU_GRAM'];
const CADENCES = ['weekly', 'biweekly', 'monthly'] as const;

type Cadence = (typeof CADENCES)[number];

export const PortfolioDcaSimulatorScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [amount, setAmount] = useState('1000');
  const [currency, setCurrency] = useState<Denomination>('TRY');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [data, setData] = useState<DcaSimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runDcaSimulation(
        symbol.trim().toUpperCase(),
        parseFloat(amount) || 0,
        currency,
        cadence,
      );
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="DCA Simülatörü"
        subtitle="Geçmişe dönük düzenli yatırım senaryosu"
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
          <Text variant="caption" color={colors.text.secondary}>
            Sembol
          </Text>
          <TextInput
            value={symbol}
            onChangeText={(v) => setSymbol(v.toUpperCase())}
            autoCapitalize="characters"
            style={inputStyle}
          />

          <Text
            variant="caption"
            color={colors.text.secondary}
            style={{ marginTop: spacing.sm }}
          >
            Her dönem miktarı
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={inputStyle}
          />

          <Text
            variant="caption"
            color={colors.text.secondary}
            style={{ marginTop: spacing.sm }}
          >
            Birim
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {CURRENCIES.map((c) => (
              <Chip
                key={c}
                label={c === 'XAU_GRAM' ? 'gr ALTIN' : c}
                active={currency === c}
                onPress={() => setCurrency(c)}
              />
            ))}
          </View>

          <Text
            variant="caption"
            color={colors.text.secondary}
            style={{ marginTop: spacing.sm }}
          >
            Sıklık
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {CADENCES.map((c) => (
              <Chip
                key={c}
                label={c === 'weekly' ? 'Haftalık' : c === 'biweekly' ? '2 Haftada' : 'Aylık'}
                active={cadence === c}
                onPress={() => setCadence(c)}
              />
            ))}
          </View>

          <Pressable
            onPress={run}
            disabled={loading}
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
              {loading ? 'Simülasyon çalışıyor…' : 'Simülasyonu başlat'}
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

        {data && (
          <>
            <ShellCard>
              <Text variant="caption" color={colors.text.secondary}>
                Senaryo
              </Text>
              <Text
                variant="body"
                color={colors.text.primary}
                style={{ marginTop: 4 }}
              >
                {data.narrative}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  marginTop: spacing.sm,
                  flexWrap: 'wrap',
                }}
              >
                <Stat label="Yatırılan" value={`$${data.total_invested.toLocaleString()}`} />
                <Stat label="Bugünkü değer" value={`$${data.final_value.toLocaleString()}`} />
                <Stat
                  label="Getiri"
                  value={`${data.total_return_pct >= 0 ? '+' : ''}${data.total_return_pct.toFixed(2)}%`}
                  tone={data.total_return_pct >= 0 ? 'positive' : 'negative'}
                />
              </View>
            </ShellCard>

            {data.series.length > 1 && (
              <ShellCard>
                <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
                  Büyüme Eğrisi
                </Text>
                <DcaChart series={data.series} />
              </ShellCard>
            )}
          </>
        )}
      </ScrollView>
    </Box>
  );
};

const inputStyle = {
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: radius.md,
  backgroundColor: colors.background.elevated,
  borderWidth: 1,
  borderColor: colors.border.soft,
  color: colors.text.primary,
  marginTop: 4,
};

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.accent.primary_blue : colors.background.elevated,
        borderWidth: 1,
        borderColor: active ? colors.accent.primary_blue : colors.border.soft,
        marginTop: 4,
        opacity: pressed ? 0.7 : 1,
      },
    ]}
  >
    <Text variant="caption" weight="600" color={active ? '#fff' : colors.text.primary}>
      {label}
    </Text>
  </Pressable>
);

const Stat: React.FC<{ label: string; value: string; tone?: 'positive' | 'negative' }> = ({
  label,
  value,
  tone,
}) => (
  <View>
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

const DcaChart: React.FC<{ series: { total_invested: number; market_value: number }[] }> = ({
  series,
}) => {
  const W = 320;
  const H = 180;
  const padding = 12;
  const xs = series.map((_, i) => i);
  const values = series.flatMap((p) => [p.total_invested, p.market_value]);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const range = Math.max(1, maxY - minY);
  const scaleX = (x: number) => padding + (x / Math.max(1, xs.length - 1)) * (W - padding * 2);
  const scaleY = (y: number) =>
    H - padding - ((y - minY) / range) * (H - padding * 2);

  const path = (getter: (p: { total_invested: number; market_value: number }) => number) =>
    series
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)} ${scaleY(getter(p)).toFixed(1)}`)
      .join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H}>
        <Line x1={padding} y1={H - padding} x2={W - padding} y2={H - padding} stroke={colors.border.soft} strokeWidth={1} />
        <Path
          d={path((p) => p.total_invested)}
          fill="none"
          stroke={colors.text.muted}
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        <Path
          d={path((p) => p.market_value)}
          fill="none"
          stroke={colors.sentiment.bull_green}
          strokeWidth={2.5}
        />
      </Svg>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
        <LegendDot color={colors.text.muted} label="Yatırılan" />
        <LegendDot color={colors.sentiment.bull_green} label="Piyasa değeri" />
      </View>
    </View>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }}
    />
    <Text variant="caption" color={colors.text.secondary}>
      {label}
    </Text>
  </View>
);
