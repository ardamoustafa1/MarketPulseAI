import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowUpRight, CheckCircle2, HelpCircle, Star } from 'lucide-react-native';
import { AssetRow } from '../../components/ui/AssetRow';
import { AISummaryCard } from '../../components/dashboard/AISummaryCard';
import { PortfolioHero } from '../../components/dashboard/PortfolioHero';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { Box } from '../../components/ui/Box';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useInsightStore } from '../../store/useInsightStore';
import { colors, radius, spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { apiClient } from '../../api/client';

export const HomeDashboardScreen = ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => {
  const [benchmarkText, setBenchmarkText] = useState<string>('Benchmark verisi hesaplanmadi');

  const { initializeRealtime, fetchQuotes, isLoading: marketLoading, quotes, lastUpdatedAt, getAssetCatalog } =
    useMarketDataStore();
  const {
    summary,
    positions,
    fetchPortfolio,
    isLoading: portfolioLoading,
  } = usePortfolioStore();
  const { favorites, fetchWatchlist } = useWatchlistStore();
  const { alerts, fetchAlerts } = useAlertStore();
  const { latestInsight, fetchLatestInsight } = useInsightStore();

  const loadAll = useCallback(async () => {
    initializeRealtime();
    await Promise.all([fetchQuotes(), fetchPortfolio(), fetchWatchlist(), fetchAlerts(), fetchLatestInsight()]);
    try {
      const { data } = await apiClient.get('/api/v1/portfolio/benchmark');
      setBenchmarkText(
        `Getirin ${data.user_return_pct}% | Piyasa medyani ${data.market_median_return_pct}% | Dilim ${data.percentile_rank}/${data.cohort_size}`
      );
    } catch {
      setBenchmarkText('Benchmark icin once maliyet olusturan en az bir islem gir.');
    }
  }, [fetchPortfolio, fetchQuotes, initializeRealtime, fetchWatchlist, fetchAlerts, fetchLatestInsight]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll])
  );

  const nameBySymbol = useMemo(() => {
    const m: Record<string, string> = {};
    getAssetCatalog().forEach((a) => {
      m[a.symbol] = a.name;
    });
    return m;
  }, [getAssetCatalog]);

  const topPositions = useMemo(() => {
    return [...positions]
      .sort((a, b) => parseFloat(b.currentValue || '0') - parseFloat(a.currentValue || '0'))
      .slice(0, 5);
  }, [positions]);

  const hasPortfolio = summary && (positions.length > 0 || parseFloat(summary.totalValue || '0') > 0);

  const totalValueStr = summary ? formatCurrency(summary.totalValue) : formatCurrency('0');
  const unrealizedPct = summary ? summary.unrealizedPnlPercent : 0;

  const isLoading = (marketLoading || portfolioLoading) && !summary && topPositions.length === 0;
  const favoritesCount = Object.keys(favorites).length;
  const activeAlertsCount = alerts.filter((a) => a.is_active).length;
  const hasInsight = Boolean(latestInsight?.cards?.length);
  const completedChecklistItems = [hasPortfolio, favoritesCount > 0, activeAlertsCount > 0].filter(Boolean).length;
  const checklistProgress = Math.round((completedChecklistItems / 3) * 100);

  const nextBestAction = useMemo(() => {
    if (!hasPortfolio) {
      return { label: 'Ilk islemi ekle', target: 'AddTransaction' };
    }
    if (favoritesCount === 0) {
      return { label: 'Izleme listene varlik ekle', target: 'Watchlist' };
    }
    if (activeAlertsCount === 0) {
      return { label: 'Ilk fiyati alarmini kur', target: 'Alerts' };
    }
    if (!hasInsight) {
      return { label: 'Ilk AI icgorunu uret', target: 'Insights' };
    }
    return { label: 'Portfoyu optimize et', target: 'Portfolio' };
  }, [hasPortfolio, favoritesCount, activeAlertsCount, hasInsight]);

  const renderSkeletons = () => (
    <Box padding={spacing.lg}>
      <Box style={{ marginTop: spacing.xxl + 20, marginBottom: spacing.xl }}>
        <Skeleton height={26} width={120} style={{ marginBottom: spacing.lg }} circle />
        <Skeleton height={60} width={280} style={{ marginBottom: spacing.md }} />
        <Skeleton height={28} width={180} />
      </Box>
      <Skeleton height={160} width="100%" style={{ marginBottom: spacing.xxl, borderRadius: radius.xl }} />
      <Skeleton height={24} width={150} style={{ marginBottom: spacing.md }} />
      {[1, 2, 3].map((i) => (
        <Box key={i} row style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
          <Skeleton height={48} width={48} circle style={{ marginRight: spacing.md }} />
          <Box flex={1}>
            <Skeleton height={18} width={100} style={{ marginBottom: 6 }} />
            <Skeleton height={14} width={60} />
          </Box>
          <Box align="flex-end">
            <Skeleton height={18} width={80} style={{ marginBottom: 6 }} />
            <Skeleton height={14} width={50} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderEmptyPortfolio = () => (
    <GuidedStateCard
      title="Portfoyun henuz bos"
      description="Ilk alim veya satim islemini ekledigin anda gercek getirini, riskini ve AI destekli yorumlari gorebilirsin."
      ctaLabel="Ilk islemi ekle"
      onPress={() => navigation.navigate('AddTransaction')}
      icon={<HelpCircle color={colors.text.muted} size={32} />}
    />
  );

  const renderHoldingsPending = () => (
    <PremiumCard delay={400} style={{ marginHorizontal: 2, paddingVertical: spacing.xxl, alignItems: 'center' }}>
      <Box
        center
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.05)',
          marginBottom: spacing.lg,
        }}
      >
        <HelpCircle color={colors.text.muted} size={32} />
      </Box>
      <Text variant="h2" weight="600" style={{ marginBottom: spacing.sm, letterSpacing: -0.5 }}>
        Varliklar senkronize ediliyor
      </Text>
      <Text
        variant="body"
        color={colors.text.secondary}
        align="center"
        style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md, lineHeight: 24 }}
      >
        Toplam deger hazir, kalemler yukleniyor. Ekrani yenileyerek devam et.
      </Text>
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => void loadAll()}>
        <Box bg={colors.text.primary} padding={spacing.md} radius={radius.pill} row align="center">
          <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>
            Yenile
          </Text>
          <ArrowUpRight color={colors.background.base} size={18} />
        </Box>
      </Pressable>
    </PremiumCard>
  );

  if (isLoading) {
    return <Box flex={1} bg={colors.background.base}>{renderSkeletons()}</Box>;
  }

  return (
    <Box flex={1} bg={colors.background.base}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={marketLoading || portfolioLoading}
            onRefresh={() => void loadAll()}
            tintColor={colors.accent.premium_gold}
          />
        }
      >
        <Box padding={spacing.lg}>
          <Box row justify="space-between" align="center" style={{ paddingTop: spacing.xl, paddingBottom: spacing.sm }}>
            <Text variant="h2" weight="600" style={{ letterSpacing: -0.5 }}>
              Genel Bakis
            </Text>
            <Pressable hitSlop={15} onPress={() => navigation.navigate('Watchlist')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Box
                center
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Star color={colors.accent.premium_gold} size={20} strokeWidth={1.5} />
              </Box>
            </Pressable>
          </Box>

          <PortfolioHero
            totalValue={totalValueStr}
            dailyChange={summary ? formatCurrency(summary.unrealizedPnl) : formatCurrency('0')}
            dailyChangePercent={unrealizedPct}
            changeLineLabel="Gerceklesmemis"
            onAddAlert={() => navigation.navigate('Alerts')}
          />

          <PremiumCard delay={140} style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
            <Box row justify="space-between" align="center" style={{ marginBottom: spacing.sm }}>
              <Text variant="h3" weight="700">Haftalik ilerleme</Text>
              <Text variant="caption" color={colors.accent.primary_blue}>{checklistProgress}% tamamlandi</Text>
            </Box>
            <Box style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: spacing.sm }}>
              <Box style={{ width: `${checklistProgress}%`, height: '100%', backgroundColor: colors.accent.primary_blue }} />
            </Box>
            <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
              {hasPortfolio ? '✓ Portfoy olustu' : '• Ilk islemini ekle'}
            </Text>
            <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
              {favoritesCount > 0 ? `✓ Izleme listesi hazir (${favoritesCount})` : '• En az 1 varligi izle'}
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              {activeAlertsCount > 0 ? `✓ Alarm kuruldu (${activeAlertsCount})` : '• En az 1 fiyat alarmi kur'}
            </Text>
          </PremiumCard>

          <PremiumCard delay={200} style={{ marginBottom: spacing.md }}>
            <Box row justify="space-between" align="center">
              <Box flex={1}>
                <Text variant="caption" color={colors.text.muted}>Siradaki en iyi adim</Text>
                <Text variant="h3" weight="700" style={{ marginTop: 4 }}>{nextBestAction.label}</Text>
              </Box>
              <Pressable onPress={() => navigation.navigate(nextBestAction.target)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <Box row align="center" bg={colors.text.primary} padding={spacing.sm} radius={radius.pill}>
                  <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>Uygula</Text>
                  <ArrowUpRight color={colors.background.base} size={16} />
                </Box>
              </Pressable>
            </Box>
          </PremiumCard>

          <PremiumCard delay={240} style={{ marginBottom: spacing.md }}>
            <Box row align="center">
              <CheckCircle2 color={colors.sentiment.bull_green} size={16} style={{ marginRight: spacing.xs }} />
              <Text variant="caption" color={colors.text.secondary}>{benchmarkText}</Text>
            </Box>
          </PremiumCard>

          {!hasPortfolio ? (
            renderEmptyPortfolio()
          ) : topPositions.length === 0 ? (
            renderHoldingsPending()
          ) : (
            <>
              <AISummaryCard
                summary="Portfoy ozetin canli fiyatlarla guncellenir. AI icgoruyu acip dogrudan aksiyon al."
                actionText="Icgorulere git"
                onPressAction={() => navigation.navigate('Insights')}
              />

              <Box row justify="space-between" align="flex-end" style={{ marginBottom: spacing.md }}>
                <Text variant="h2">En buyuk varliklar</Text>
                <Text variant="body" color={colors.accent.primary_blue}>
                  {lastUpdatedAt ? `Fiyatlar ${new Date(lastUpdatedAt).toLocaleTimeString()}` : 'Canli'}
                </Text>
              </Box>

              <View style={{ marginBottom: spacing.xxl }}>
                {topPositions.map((p) => {
                  const live = quotes[p.symbol];
                  const displayName = nameBySymbol[p.symbol] ?? p.name ?? p.symbol;
                  const priceStr = live ? formatCurrency(live.price) : formatCurrency(p.currentValue);
                  const chg = live ? live.changePercent : p.unrealizedPnlPercent;
                  return (
                    <AssetRow
                      key={p.symbol}
                      symbol={p.symbol}
                      name={displayName}
                      price={priceStr}
                      changePercent={chg}
                      onPress={() => navigation.navigate('AssetDetail', { symbol: p.symbol })}
                    />
                  );
                })}
              </View>
            </>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};
