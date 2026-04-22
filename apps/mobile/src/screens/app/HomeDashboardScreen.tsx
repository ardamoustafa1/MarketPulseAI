import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowUpRight, HelpCircle, Star } from 'lucide-react-native';
import { AssetRow } from '../../components/ui/AssetRow';
import { AISummaryCard } from '../../components/dashboard/AISummaryCard';
import { PortfolioHero } from '../../components/dashboard/PortfolioHero';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { Box } from '../../components/ui/Box';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { colors, radius, spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

export const HomeDashboardScreen = ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => {
  const { initializeRealtime, fetchQuotes, isLoading: marketLoading, quotes, lastUpdatedAt, getAssetCatalog } =
    useMarketDataStore();
  const {
    summary,
    positions,
    fetchPortfolio,
    isLoading: portfolioLoading,
  } = usePortfolioStore();

  const loadAll = useCallback(async () => {
    initializeRealtime();
    await Promise.all([fetchQuotes(), fetchPortfolio()]);
  }, [fetchPortfolio, fetchQuotes, initializeRealtime]);

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
        No portfolio yet
      </Text>
      <Text
        variant="body"
        color={colors.text.secondary}
        align="center"
        style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md, lineHeight: 24 }}
      >
        Add a buy or sell transaction to see your real holdings and P&amp;L here.
      </Text>
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => navigation.navigate('Portfolio')}>
        <Box bg={colors.text.primary} padding={spacing.md} radius={radius.pill} row align="center">
          <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>
            Open portfolio
          </Text>
          <ArrowUpRight color={colors.background.base} size={18} />
        </Box>
      </Pressable>
    </PremiumCard>
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
        Holdings syncing
      </Text>
      <Text
        variant="body"
        color={colors.text.secondary}
        align="center"
        style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md, lineHeight: 24 }}
      >
        Total value is available but line items are not loaded yet. Pull to refresh.
      </Text>
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => void loadAll()}>
        <Box bg={colors.text.primary} padding={spacing.md} radius={radius.pill} row align="center">
          <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>
            Refresh
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
              Overview
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
            changeLineLabel="Unrealized"
            onAddAlert={() => navigation.navigate('Alerts')}
          />

          {!hasPortfolio ? (
            renderEmptyPortfolio()
          ) : topPositions.length === 0 ? (
            renderHoldingsPending()
          ) : (
            <>
              <AISummaryCard
                summary="Your overview uses live prices from your default portfolio. Open Insights for AI summaries."
                actionText="Open Insights"
                onPressAction={() => navigation.navigate('Insights')}
              />

              <Box row justify="space-between" align="flex-end" style={{ marginBottom: spacing.md }}>
                <Text variant="h2">Top holdings</Text>
                <Text variant="body" color={colors.accent.primary_blue}>
                  {lastUpdatedAt ? `Quotes ${new Date(lastUpdatedAt).toLocaleTimeString()}` : 'Live'}
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
