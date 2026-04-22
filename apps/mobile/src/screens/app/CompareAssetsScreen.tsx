import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { DualNormalizedChart } from '../../components/charts/DualNormalizedChart';
import { Box } from '../../components/ui/Box';
import { Input } from '../../components/ui/Input';
import { Text } from '../../components/ui/Text';
import { fetchCompare } from '../../api/charts';
import { colors, radius, spacing } from '../../theme';

const RANGE_KEYS = ['1W', '1M', '1Y'] as const;

export const CompareAssetsScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [a, setA] = useState('BTC');
  const [b, setB] = useState('ETH');
  const [range, setRange] = useState<(typeof RANGE_KEYS)[number]>('1M');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [seriesA, setSeriesA] = useState<number[]>([]);
  const [seriesB, setSeriesB] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchCompare([a.trim().toUpperCase(), b.trim().toUpperCase()], range);
      const s0 = data.series[0]?.points.map((p) => p.close) ?? [];
      const s1 = data.series[1]?.points.map((p) => p.close) ?? [];
      setSeriesA(s0);
      setSeriesB(s1);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Failed to load compare');
      setSeriesA([]);
      setSeriesB([]);
    } finally {
      setLoading(false);
    }
  }, [a, b, range]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box flex={1} bg={colors.background.base} style={{ paddingTop: insets.top }}>
      <Box row align="center" justify="space-between" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common:compare')}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h2" weight="600">
          {t('compare:title')}
        </Text>
        <Pressable onPress={() => void load()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <RefreshCw color={colors.text.secondary} size={22} />
        </Pressable>
      </Box>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24 }}>
        <Text variant="body" color={colors.text.secondary} style={{ marginBottom: spacing.lg }}>
          {t('compare:subtitle')}
        </Text>

        <Box row style={{ marginBottom: spacing.md }}>
          <Box flex={1} style={{ marginRight: spacing.sm }}>
            <Text variant="caption" color={colors.text.muted} style={{ marginBottom: 4 }}>
              {t('compare:symbolA')}
            </Text>
            <Input value={a} onChangeText={setA} autoCapitalize="characters" placeholder="BTC" />
          </Box>
          <Box flex={1}>
            <Text variant="caption" color={colors.text.muted} style={{ marginBottom: 4 }}>
              {t('compare:symbolB')}
            </Text>
            <Input value={b} onChangeText={setB} autoCapitalize="characters" placeholder="ETH" />
          </Box>
        </Box>

        <Box row justify="space-between" style={{ marginBottom: spacing.lg }}>
          {RANGE_KEYS.map((rk) => (
            <Pressable key={rk} onPress={() => setRange(rk)} style={{ flex: 1, marginHorizontal: 4 }}>
              <Box
                center
                style={[
                  styles.pill,
                  range === rk && { backgroundColor: 'rgba(74, 92, 130, 0.35)', borderColor: colors.accent.primary_blue },
                ]}
              >
                <Text variant="caption" weight="600">
                  {rk}
                </Text>
              </Box>
            </Pressable>
          ))}
        </Box>

        {err ? (
          <Text variant="body" color={colors.sentiment.bear_red} style={{ marginBottom: spacing.md }}>
            {String(err)}
          </Text>
        ) : null}

        {loading ? (
          <Text variant="body" color={colors.text.secondary}>
            …
          </Text>
        ) : (
          <DualNormalizedChart seriesA={seriesA} seriesB={seriesB} />
        )}

        <Box row style={{ marginTop: spacing.lg, justifyContent: 'center', gap: spacing.xl }}>
          <Box row align="center">
            <Box style={[styles.dot, { backgroundColor: colors.accent.primary_blue }]} />
            <Text variant="caption">{a.toUpperCase()}</Text>
          </Box>
          <Box row align="center">
            <Box style={[styles.dot, { backgroundColor: colors.sentiment.bull_green }]} />
            <Text variant="caption">{b.toUpperCase()}</Text>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
});
