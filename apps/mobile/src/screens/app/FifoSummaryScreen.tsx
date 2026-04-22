import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { colors, spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

type Row = {
  symbol: string;
  fifo_realized_pnl: string;
  remaining_quantity: string;
  remaining_cost_basis_fifo: string;
};

export const FifoSummaryScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ rows: Row[] }>('/api/v1/portfolio/fifo', {
        params: activePortfolioId ? { portfolio_id: activePortfolioId } : {},
      });
      setRows(data?.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activePortfolioId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box flex={1} bg={colors.background.base} style={{ paddingTop: insets.top }}>
      <Box row align="center" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h2" weight="600" style={{ marginLeft: spacing.md }}>
          {t('common:fifoSummary')}
        </Text>
      </Box>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24 }}>
        <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.lg }}>
          FIFO sell matching (indicative). Consult a tax professional for filings.
        </Text>
        {loading ? (
          <Text color={colors.text.secondary}>…</Text>
        ) : rows.length === 0 ? (
          <Text color={colors.text.secondary}>No FIFO data.</Text>
        ) : (
          rows.map((r) => (
            <Box key={r.symbol} style={styles.card}>
              <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
                {r.symbol}
              </Text>
              <Text variant="body">Realized (FIFO): {formatCurrency(r.fifo_realized_pnl)}</Text>
              <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 4 }}>
                Remaining qty {r.remaining_quantity} · Cost basis {formatCurrency(r.remaining_cost_basis_fifo)}
              </Text>
            </Box>
          ))
        )}
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
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
