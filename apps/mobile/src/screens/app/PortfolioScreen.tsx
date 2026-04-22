import React, { useEffect, useMemo } from 'react';
import { ScrollView, RefreshControl, Pressable, View, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { SummaryWidget } from '../../components/portfolio/SummaryWidget';
import { AllocationChart } from '../../components/portfolio/AllocationChart';
import { PositionRow } from '../../components/portfolio/PositionRow';
import { colors, radius, spacing } from '../../theme';
import { HelpCircle, ArrowUpRight, PlusCircle } from 'lucide-react-native';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { formatCurrencyByLocale, formatNumberByLocale } from '../../utils/localeFormat';

const ALLOCATION_COLORS = ['#F7931A', '#627EEA', '#14F195', '#26A17B', '#C8A97E', '#4A5C82'];

const formatCurrency = (value: string) => formatCurrencyByLocale(value, 'USD');
const formatCompactNumber = (value: string) => formatNumberByLocale(value, 4);

export const PortfolioScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const {
    summary,
    positions,
    isLoading,
    error,
    fetchPortfolio,
    clearError,
    buckets,
    activePortfolioId,
    setActivePortfolioId,
    fetchBuckets,
  } = usePortfolioStore();

  useEffect(() => {
    void fetchBuckets();
  }, [fetchBuckets]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const hasData = positions.length > 0;

  const allocationData = useMemo(() => {
    const totalCurrentValue = Number(summary?.totalValue ?? 0);
    if (!Number.isFinite(totalCurrentValue) || totalCurrentValue <= 0) {
      return [];
    }

    return positions
      .map((position, index) => {
        const currentValue = Number(position.currentValue);
        return {
          symbol: position.symbol,
          percentage: totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0,
          color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
        };
      })
      .filter((item) => Number.isFinite(item.percentage) && item.percentage > 0);
  }, [positions, summary]);

  const handleAddTx = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation?.getParent()?.navigate('AddTransaction');
  };

  const renderSkeletons = () => (
    <Box padding={spacing.lg}>
      <Box style={{ marginTop: spacing.xxl + 20, marginBottom: spacing.xl }}>
        <Skeleton height={20} width={150} style={{ marginBottom: spacing.md }} />
        <Skeleton height={60} width="80%" style={{ marginBottom: spacing.md }} />
        <Skeleton height={24} width={200} />
      </Box>
      <Skeleton height={80} width="100%" style={{ marginBottom: spacing.xxl, borderRadius: radius.lg }} />
      <Skeleton height={20} width={120} style={{ marginBottom: spacing.md }} />
      <Skeleton height={12} width="100%" style={{ marginBottom: spacing.xl, borderRadius: radius.pill }} />
      {[1, 2, 3].map((i) => (
        <Box key={i} row justify="space-between" style={{ paddingVertical: spacing.md }}>
          <Box>
            <Skeleton height={20} width={60} style={{ marginBottom: 6 }} />
            <Skeleton height={14} width={100} />
          </Box>
          <Box align="flex-end">
            <Skeleton height={20} width={80} style={{ marginBottom: 6 }} />
            <Skeleton height={14} width={120} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderEmptyState = () => (
    <PremiumCard delay={200} style={{ paddingVertical: spacing.xxl, alignItems: 'center', marginTop: spacing.xl }}>
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
        Zero Assets Registered
      </Text>
      <Text
        variant="body"
        color={colors.text.secondary}
        align="center"
        style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md, lineHeight: 24 }}
      >
        Your portfolio timeline begins right here. Record your first transaction to unlock dynamic PnL tracking and AI insights.
      </Text>
      <Pressable onPress={handleAddTx} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        <Box bg={colors.text.primary} padding={spacing.md} radius={radius.pill} row align="center">
          <Text color={colors.background.base} weight="600" style={{ marginRight: spacing.xs }}>
            Manually Add Tx
          </Text>
          <ArrowUpRight color={colors.background.base} size={18} />
        </Box>
      </Pressable>
    </PremiumCard>
  );

  const renderErrorState = () => (
    <PremiumCard delay={150} style={{ paddingVertical: spacing.xl, alignItems: 'center', marginTop: spacing.xl }}>
      <Text variant="h3" weight="600" style={{ marginBottom: spacing.sm }}>
        Portfolio verisi yuklenemedi
      </Text>
      <Text variant="body" color={colors.text.secondary} align="center" style={{ marginBottom: spacing.lg, paddingHorizontal: spacing.md }}>
        {error ?? 'Portfoyu yuklemek icin baglantini kontrol et ve tekrar dene.'}
      </Text>
      <Pressable
        onPress={() => {
          clearError();
          fetchPortfolio();
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <Box bg={colors.text.primary} padding={spacing.md} radius={radius.pill}>
          <Text color={colors.background.base} weight="600">Tekrar dene</Text>
        </Box>
      </Pressable>
    </PremiumCard>
  );

  if (isLoading && !summary) {
    return <Box flex={1} bg={colors.background.base}>{renderSkeletons()}</Box>;
  }

  return (
    <Box flex={1} bg={colors.background.base}>
      <View style={styles.blurHeaderWrap}>
        <BlurView intensity={80} tint="dark" style={[styles.blurHeader, { paddingTop: insets.top + 8 }]}>
          <Box row justify="space-between" align="center" style={styles.headerContent}>
            <Text variant="h3" weight="700" style={{ letterSpacing: -0.5 }}>My Vault</Text>
            <Pressable onPress={handleAddTx} hitSlop={15} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}> 
              <Box row align="center" style={styles.addBtn}>
                <Text variant="caption" weight="600" color={colors.accent.premium_gold} style={{ marginRight: 6 }}>Add</Text>
                <PlusCircle color={colors.accent.premium_gold} size={18} />
              </Box>
            </Pressable>
          </Box>
        </BlurView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchPortfolio} tintColor={colors.text.muted} />}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 40 }}
      >
        {buckets.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: spacing.md, marginHorizontal: -spacing.lg }}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          >
            {buckets.map((b, i) => {
              const active = activePortfolioId ? b.id === activePortfolioId : b.is_default;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => void setActivePortfolioId(b.id)}
                  style={{ marginRight: i === buckets.length - 1 ? 0 : 8 }}
                >
                  <Box
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: active ? colors.accent.primary_blue : 'rgba(255,255,255,0.1)',
                      backgroundColor: active ? 'rgba(74, 92, 130, 0.35)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Text variant="caption" weight="600">
                      {b.name}
                    </Text>
                  </Box>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {summary && summary.valuationComplete === false ? (
          <Box style={{ marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,184,0,0.28)', backgroundColor: 'rgba(255,184,0,0.08)' }}>
            <Text variant="caption" color={colors.text.secondary}>
              Valuation is partial: {summary.missingPricePositions ?? 0} missing price, {summary.stalePricePositions ?? 0} stale price position(s).
            </Text>
          </Box>
        ) : null}

        <SummaryWidget
          totalValue={formatCurrency(summary?.totalValue ?? '0')}
          totalInvested={formatCurrency(summary?.totalInvested ?? '0')}
          unrealizedPnl={formatCurrency(summary?.unrealizedPnl ?? '0')}
          unrealizedPnlPercent={summary?.unrealizedPnlPercent ?? 0}
          realizedPnl={formatCurrency(summary?.realizedPnl ?? '0')}
          dailyChange={summary?.dailyChange ?? '0'}
          dailyChangePercent={summary?.dailyChangePercent ?? 0}
        />

        {error && !hasData ? (
          renderErrorState()
        ) : !hasData ? (
          renderEmptyState()
        ) : (
          <Animated.View entering={FadeInUp.duration(600).springify().damping(20)}>
            {allocationData.length > 0 ? <AllocationChart data={allocationData} /> : null}

            <Box row justify="space-between" align="flex-end" style={{ marginBottom: spacing.md }}>
              <Text variant="h2" weight="600" style={{ letterSpacing: -0.5 }}>Your Assets</Text>
            </Box>

            <Box style={{ marginBottom: spacing.xl }}>
              {positions.map((pos) => (
                <PositionRow
                  key={pos.id}
                  symbol={pos.symbol}
                  name={pos.name}
                  holdingsQty={formatCompactNumber(pos.quantity)}
                  currentValue={formatCurrency(pos.currentValue)}
                  unrealizedPnl={formatCurrency(pos.unrealizedPnl)}
                  unrealizedPercent={pos.unrealizedPnlPercent}
                  onPress={() => navigation?.navigate('AssetDetail', { symbol: pos.symbol })}
                />
              ))}
            </Box>
          </Animated.View>
        )}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  blurHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  blurHeader: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
  },
  addBtn: {
    backgroundColor: 'rgba(200, 169, 126, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(200, 169, 126, 0.2)',
  },
});
