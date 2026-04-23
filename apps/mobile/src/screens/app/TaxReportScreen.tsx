import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Download, FileBarChart, Share2 } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { buildTaxExport } from '../../api/proTools';
import type { TaxExportView } from '../../types/proTools';
import { colors, radius, spacing } from '../../theme';

const METHODS: Array<'fifo' | 'lifo'> = ['fifo', 'lifo'];
const YEARS = [
  new Date().getUTCFullYear(),
  new Date().getUTCFullYear() - 1,
  new Date().getUTCFullYear() - 2,
];

export const TaxReportScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<'fifo' | 'lifo'>('fifo');
  const [taxYear, setTaxYear] = useState<number | null>(YEARS[0]);
  const [includeUnrealized, setIncludeUnrealized] = useState(true);
  const [data, setData] = useState<TaxExportView | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await buildTaxExport({
          method,
          tax_year: taxYear,
          include_unrealized: includeUnrealized,
        }),
      );
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Rapor oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  }, [method, taxYear, includeUnrealized]);

  const shareCsv = useCallback(async () => {
    if (!data) return;
    try {
      const filename = `marketpulse_tax_${data.tax_year ?? 'all'}_${data.method}.csv`;
      const uri = `${cacheDirectory}${filename}`;
      await writeAsStringAsync(uri, data.csv_body, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Vergi Raporu — CSV',
        });
      } else {
        Alert.alert('Paylaşım yok', 'Dosya cihazınıza kaydedildi: ' + uri);
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Paylaşım başarısız oldu.');
    }
  }, [data]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Vergi Raporu"
        subtitle="FIFO/LIFO — CSV export"
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
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border.soft,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text variant="caption" color={colors.text.muted}>
            Yöntem
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {METHODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor:
                    method === m ? colors.accent.premium_gold : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    method === m ? colors.accent.premium_gold : colors.border.soft,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  color={method === m ? '#0B0B0F' : colors.text.primary}
                >
                  {m.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text variant="caption" color={colors.text.muted}>
            Vergi yılı
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {YEARS.map((y) => (
              <Pressable
                key={y}
                onPress={() => setTaxYear(y)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor:
                    taxYear === y ? colors.accent.premium_gold : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    taxYear === y ? colors.accent.premium_gold : colors.border.soft,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  color={taxYear === y ? '#0B0B0F' : colors.text.primary}
                >
                  {y}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setTaxYear(null)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor:
                  taxYear === null ? colors.accent.premium_gold : 'transparent',
                borderWidth: 1,
                borderColor:
                  taxYear === null ? colors.accent.premium_gold : colors.border.soft,
              }}
            >
              <Text
                variant="caption"
                weight="700"
                color={taxYear === null ? '#0B0B0F' : colors.text.primary}
              >
                Tümü
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setIncludeUnrealized((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingVertical: 6,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: colors.border.soft,
                backgroundColor: includeUnrealized
                  ? colors.accent.premium_gold
                  : 'transparent',
              }}
            />
            <Text variant="caption" color={colors.text.primary}>
              Gerçekleşmemiş pozisyonları da dahil et
            </Text>
          </Pressable>

          <Pressable
            onPress={run}
            disabled={loading}
            style={{
              marginTop: spacing.xs,
              paddingVertical: 12,
              borderRadius: radius.md,
              backgroundColor: colors.accent.premium_gold,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" weight="700" color="#0B0B0F">
              {loading ? 'Oluşturuluyor...' : 'Raporu oluştur'}
            </Text>
          </Pressable>
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
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <FileBarChart size={18} color={colors.accent.premium_gold} />
                  <Text variant="body" weight="700">
                    Özet
                  </Text>
                </View>
                <Text variant="caption" color={colors.text.secondary}>
                  Gerçekleşen K/Z:{' '}
                  <Text
                    variant="caption"
                    weight="700"
                    color={
                      data.total_realized_pnl >= 0 ? '#3BD984' : '#FF5C5C'
                    }
                  >
                    {data.total_realized_pnl.toFixed(2)}
                  </Text>
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  Gerçekleşmemiş: {data.total_unrealized_pnl.toFixed(2)}
                </Text>
                <Text
                  variant="caption"
                  color={colors.text.muted}
                  style={{ marginTop: 4 }}
                >
                  {data.disclosure}
                </Text>
              </View>
            </Animated.View>

            <Pressable
              onPress={shareCsv}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                paddingVertical: 12,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border.soft,
                backgroundColor: colors.background.surface,
              }}
            >
              <Share2 size={18} color={colors.accent.premium_gold} />
              <Text variant="caption" weight="700">
                CSV'yi paylaş / indir
              </Text>
              <Download size={16} color={colors.text.muted} />
            </Pressable>

            <Text variant="caption" color={colors.text.muted}>
              Satırlar ({data.rows.length})
            </Text>
            {data.rows.slice(0, 40).map((row, i) => (
              <Animated.View
                key={`${row.symbol}-${i}`}
                entering={FadeInUp.delay(i * 18).springify().damping(18)}
              >
                <View
                  style={{
                    backgroundColor: colors.background.surface,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border.soft,
                    padding: spacing.md,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text variant="caption" weight="700">
                      {row.symbol}
                    </Text>
                    <Text
                      variant="caption"
                      weight="700"
                      color={
                        row.realized_pnl == null
                          ? colors.text.muted
                          : row.realized_pnl >= 0
                            ? '#3BD984'
                            : '#FF5C5C'
                      }
                    >
                      {row.realized_pnl == null
                        ? '—'
                        : row.realized_pnl.toFixed(2)}
                    </Text>
                  </View>
                  <Text variant="caption" color={colors.text.secondary}>
                    {row.acquired_on ?? '—'} → {row.disposed_on ?? 'açık'} ·{' '}
                    {row.quantity.toFixed(6)}
                  </Text>
                </View>
              </Animated.View>
            ))}
            {data.rows.length > 40 && (
              <Text
                variant="caption"
                color={colors.text.muted}
                align="center"
              >
                +{data.rows.length - 40} satır — CSV'de tamamı var.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </Box>
  );
};
