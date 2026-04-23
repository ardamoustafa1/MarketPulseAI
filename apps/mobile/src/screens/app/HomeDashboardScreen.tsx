import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowUpRight, CheckCircle2, HelpCircle, Star } from 'lucide-react-native';
import { AssetRow } from '../../components/ui/AssetRow';
import { AISummaryCard } from '../../components/dashboard/AISummaryCard';
import { HeroRange, PortfolioHero } from '../../components/dashboard/PortfolioHero';
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
import { useStatsStore } from '../../store/useStatsStore';
import { useRecapStore } from '../../store/useRecapStore';
import { useAcademyStore } from '../../store/useAcademyStore';
import { AlertsRail } from '../../components/dashboard/AlertsRail';
import { SocialProofRail } from '../../components/dashboard/SocialProofRail';
import { AcademyRail } from '../../components/dashboard/AcademyRail';
import { WeeklyRecapCard } from '../../components/dashboard/WeeklyRecapCard';
import { IntelligenceHubCard } from '../../components/dashboard/IntelligenceHubCard';
import { PortfolioPowersCard } from '../../components/dashboard/PortfolioPowersCard';
import { SocialHubCard } from '../../components/dashboard/SocialHubCard';
import { ProToolsCard } from '../../components/dashboard/ProToolsCard';
import { DynamicBgTint } from '../../components/effects/DynamicBgTint';
import { colors, radius, spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

export const HomeDashboardScreen = ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => {
  const { t } = useTranslation();
  const [benchmarkText, setBenchmarkText] = useState<string>(t('dashboard.benchmarkMissing'));
  const [heroRange, setHeroRange] = useState<HeroRange>('1D');

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
  const { activity, fetchActivity } = useStatsStore();
  const { weekly, fetchWeekly } = useRecapStore();
  const { list: academyList, fetchList: fetchAcademy } = useAcademyStore();

  const loadAll = useCallback(async () => {
    try {
      initializeRealtime();
      const locale = (i18n.language || 'tr').split('-')[0];
      await Promise.allSettled([
        fetchQuotes(),
        fetchPortfolio(),
        fetchWatchlist(),
        fetchAlerts(),
        fetchLatestInsight(),
        fetchActivity(),
        fetchWeekly(),
        fetchAcademy(locale),
      ]);
      try {
        const { data } = await apiClient.get('/api/v1/portfolio/benchmark');
        setBenchmarkText(
          t('dashboard.benchmarkLine', {
            user: data.user_return_pct,
            median: data.market_median_return_pct,
            rank: data.percentile_rank,
            cohort: data.cohort_size,
          })
        );
      } catch {
        setBenchmarkText(t('dashboard.benchmarkNeedTx'));
      }
    } catch {
      // Keep dashboard alive even when one startup task misbehaves.
      setBenchmarkText(t('dashboard.benchmarkNeedTx'));
    }
  }, [
    fetchPortfolio,
    fetchQuotes,
    initializeRealtime,
    fetchWatchlist,
    fetchAlerts,
    fetchLatestInsight,
    fetchActivity,
    fetchWeekly,
    fetchAcademy,
    t,
  ]);

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

  const totalValueNum = summary ? Number.parseFloat(summary.totalValue || '0') : 0;
  const unrealizedPct = summary ? summary.unrealizedPnlPercent : 0;

  const sparklineByRange = useMemo<Partial<Record<HeroRange, number[]>>>(() => {
    const base = totalValueNum || 100;
    const chgRatio = unrealizedPct / 100;
    const synthesize = (bars: number, amplitude: number) =>
      Array.from({ length: bars }).map((_, i) => {
        const t = i / (bars - 1);
        const drift = chgRatio * t;
        const wave = Math.sin(i * 0.65) * amplitude;
        return base * (1 + drift + wave);
      });
    return {
      '1D': synthesize(24, 0.006),
      '1W': synthesize(32, 0.014),
      '1M': synthesize(40, 0.022),
      '3M': synthesize(48, 0.035),
    };
  }, [totalValueNum, unrealizedPct]);

  const isLoading = (marketLoading || portfolioLoading) && !summary && topPositions.length === 0;
  const favoritesCount = Object.keys(favorites).length;
  const activeAlertsCount = alerts.filter((a) => a.is_active).length;
  const hasInsight = Boolean(latestInsight?.cards?.length);
  const completedChecklistItems = [hasPortfolio, favoritesCount > 0, activeAlertsCount > 0].filter(Boolean).length;
  const checklistProgress = Math.round((completedChecklistItems / 3) * 100);

  const nextBestAction = useMemo(() => {
    if (!hasPortfolio) {
      return { label: t('dashboard.firstTx'), target: 'AddTransaction' as const };
    }
    if (favoritesCount === 0) {
      return { label: t('dashboard.addWatchlist'), target: 'Watchlist' as const };
    }
    if (activeAlertsCount === 0) {
      return { label: t('dashboard.firstAlert'), target: 'Alerts' as const };
    }
    if (!hasInsight) {
      return { label: t('dashboard.firstInsight'), target: 'Insights' as const };
    }
    return { label: t('dashboard.openCoach'), target: 'StrategyHub' as const };
  }, [hasPortfolio, favoritesCount, activeAlertsCount, hasInsight, t]);

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
      title={t('dashboard.emptyTitle')}
      description={t('dashboard.emptyDesc')}
      ctaLabel={t('dashboard.firstTx')}
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
        {t('dashboard.loadingAssetsTitle')}
      </Text>
      <Text
        variant="body"
        color={colors.text.secondary}
        align="center"
        style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md, lineHeight: 24 }}
      >
        {t('dashboard.loadingAssetsDesc')}
      </Text>
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => void loadAll()}>
        <Box bg={colors.text.primary} padding={spacing.md} radius={radius.pill} row align="center">
          <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>
            {t('dashboard.refresh')}
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
      <DynamicBgTint pnlPct={unrealizedPct} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
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
              {t('dashboard.overviewTitle')}
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
            totalValue={totalValueNum}
            currency="USD"
            dailyChange={summary ? formatCurrency(summary.unrealizedPnl) : formatCurrency('0')}
            dailyChangePercent={unrealizedPct}
            changeLineLabel={t('dashboard.heroChangeLine')}
            sparklineByRange={sparklineByRange}
            range={heroRange}
            onChangeRange={setHeroRange}
            onAddAlert={() => navigation.navigate('Alerts')}
          />

          <IntelligenceHubCard onPress={() => navigation.navigate('IntelligenceHub')} />

          <PortfolioPowersCard onPress={() => navigation.navigate('PortfolioPowersHub')} />

          <ProToolsCard onPress={() => navigation.navigate('ProToolsHub')} />

          <SocialHubCard onPress={() => navigation.navigate('SocialHub')} />

          <SocialProofRail activity={activity} />

          <AlertsRail
            alerts={alerts}
            onPressAll={() => navigation.navigate('Alerts')}
            onPressAlert={() => navigation.navigate('Alerts')}
          />

          {hasPortfolio ? (
            <WeeklyRecapCard
              headline={weekly?.headline}
              subtitle={weekly?.narrative}
              onPress={() => navigation.navigate('WeeklyRecap')}
            />
          ) : null}

          <PremiumCard delay={140} style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
            <Box row justify="space-between" align="center" style={{ marginBottom: spacing.sm }}>
              <Text variant="h3" weight="700">{t('dashboard.weeklyProgress')}</Text>
              <Text variant="caption" color={colors.accent.primary_blue}>{t('dashboard.progressDone', { value: checklistProgress })}</Text>
            </Box>
            <Box style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: spacing.sm }}>
              <Box style={{ width: `${checklistProgress}%`, height: '100%', backgroundColor: colors.accent.primary_blue }} />
            </Box>
            <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
              {hasPortfolio ? t('dashboard.holdingsReady') : t('dashboard.holdingsMissing')}
            </Text>
            <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
              {favoritesCount > 0 ? t('dashboard.watchlistReady', { count: favoritesCount }) : t('dashboard.watchlistMissing')}
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              {activeAlertsCount > 0 ? t('dashboard.alertsReady', { count: activeAlertsCount }) : t('dashboard.alertsMissing')}
            </Text>
          </PremiumCard>

          <PremiumCard delay={200} style={{ marginBottom: spacing.md }}>
            <Box row justify="space-between" align="center">
              <Box flex={1}>
                <Text variant="caption" color={colors.text.muted}>{t('dashboard.nextBestAction')}</Text>
                <Text variant="h3" weight="700" style={{ marginTop: 4 }}>{nextBestAction.label}</Text>
              </Box>
              <Pressable onPress={() => navigation.navigate(nextBestAction.target)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <Box row align="center" bg={colors.text.primary} padding={spacing.sm} radius={radius.pill}>
                  <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>{t('dashboard.apply')}</Text>
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

          <PremiumCard delay={280} style={{ marginBottom: spacing.md }}>
            <Box row justify="space-between" align="center">
              <Box flex={1}>
                <Text variant="caption" color={colors.text.muted}>{t('dashboard.coachFlow')}</Text>
                <Text variant="h3" weight="700" style={{ marginTop: 4 }}>{t('dashboard.coachFlowLine')}</Text>
              </Box>
              <Pressable onPress={() => navigation.navigate('StrategyHub')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <Box row align="center" bg={colors.text.primary} padding={spacing.sm} radius={radius.pill}>
                  <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>{t('dashboard.open')}</Text>
                  <ArrowUpRight color={colors.background.base} size={16} />
                </Box>
              </Pressable>
            </Box>
          </PremiumCard>

          <AcademyRail
            articles={academyList}
            onPressArticle={(slug) => navigation.navigate('AcademyArticle', { slug })}
            onPressAll={() => navigation.navigate('Academy')}
          />

          {hasPortfolio ? (
            <Pressable
              onPress={() => navigation.navigate('MonthlyWrapped')}
              style={({ pressed }) => [{ marginBottom: spacing.md, opacity: pressed ? 0.85 : 1 }]}
            >
              <PremiumCard delay={300} glowColor="rgba(200,169,126,0.18)">
                <Box row justify="space-between" align="center">
                  <Box flex={1}>
                    <Text variant="caption" color={colors.accent.premium_gold} weight="700" style={{ letterSpacing: 1.4 }}>
                      {t('dashboard.wrappedEyebrow')}
                    </Text>
                    <Text variant="h3" weight="700" style={{ marginTop: 4 }}>
                      {t('dashboard.wrappedTitle')}
                    </Text>
                    <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 4 }}>
                      {t('dashboard.wrappedDesc')}
                    </Text>
                  </Box>
                  <ArrowUpRight color={colors.text.primary} size={18} />
                </Box>
              </PremiumCard>
            </Pressable>
          ) : null}

          {!hasPortfolio ? (
            renderEmptyPortfolio()
          ) : topPositions.length === 0 ? (
            renderHoldingsPending()
          ) : (
            <>
              <AISummaryCard
                summary={t('dashboard.emptyDesc')}
                actionText={t('dashboard.insightsCta')}
                onPressAction={() => navigation.navigate('Insights')}
              />

              <Box row justify="space-between" align="flex-end" style={{ marginBottom: spacing.md }}>
                <Text variant="h2">{t('dashboard.largestAssets')}</Text>
                <Text variant="body" color={colors.accent.primary_blue}>
                  {lastUpdatedAt ? `${t('common.lastUpdate')} ${new Date(lastUpdatedAt).toLocaleTimeString()}` : t('dashboard.live')}
                </Text>
              </Box>

              <View style={{ marginBottom: spacing.xxl }}>
                {topPositions.map((p) => {
                  const live = quotes[p.symbol];
                  const displayName = nameBySymbol[p.symbol] ?? p.name ?? p.symbol;
                  const priceStr = live ? formatCurrency(live.price) : formatCurrency(p.currentValue);
                  const chg = live ? live.changePercent : p.unrealizedPnlPercent;
                  const priceValue = live ? Number(live.price) : Number.parseFloat(p.currentValue || '0');
                  return (
                    <AssetRow
                      key={p.symbol}
                      symbol={p.symbol}
                      name={displayName}
                      price={priceStr}
                      priceValue={priceValue}
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
