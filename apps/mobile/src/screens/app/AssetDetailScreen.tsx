import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowLeftRight, BellPlus, Share2, Star, Zap } from 'lucide-react-native';
import { fetchPriceHistory } from '../../api/charts';
import { AISummaryCard } from '../../components/dashboard/AISummaryCard';
import { CreateAlertSheet } from '../../components/alert/CreateAlertSheet';
import { PriceLineChart } from '../../components/charts/PriceLineChart';
import { PositionSummaryCard } from '../../components/asset/PositionSummaryCard';
import { RangeSelector } from '../../components/asset/RangeSelector';
import { DeepCardSection } from '../../components/deep-card/DeepCardSection';
import { AssetSocialProof } from '../../components/effects/AssetSocialProof';
import { LiveDataBadge } from '../../components/trust/LiveDataBadge';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { colors, radius, spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { formatQuoteSourceLabel, formatQuoteTime } from '../../utils/quoteLabels';

const RANGES = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];

function toDataBadge(source?: string, isStale?: boolean): 'LIVE' | 'DERIVED' | 'STALE' {
  if (isStale) {
    return 'STALE';
  }
  if ((source ?? '').toLowerCase().startsWith('derived')) {
    return 'DERIVED';
  }
  return 'LIVE';
}

function badgeStyle(badge: 'LIVE' | 'DERIVED' | 'STALE') {
  if (badge === 'LIVE') {
    return {
      container: styles.badgeLive,
      textColor: colors.sentiment.bull_green,
    };
  }
  if (badge === 'STALE') {
    return {
      container: styles.badgeStale,
      textColor: colors.sentiment.bear_red,
    };
  }
  return {
    container: styles.badgeDerived,
    textColor: colors.text.secondary,
  };
}

export const AssetDetailScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [activeRange, setActiveRange] = useState('1D');
  const [showAlertSheet, setShowAlertSheet] = useState(false);
  const [historyCloses, setHistoryCloses] = useState<number[]>([]);

  const symbol = String(route?.params?.symbol ?? 'BTC').toUpperCase();
  const { initializeRealtime, fetchQuotes, getQuote } = useMarketDataStore();
  const { isFavorite, toggleFavorite } = useWatchlistStore();

  useEffect(() => {
    initializeRealtime();
    fetchQuotes([symbol]);
  }, [fetchQuotes, initializeRealtime, symbol]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPriceHistory(symbol, activeRange);
        if (!cancelled) {
          setHistoryCloses(data.points.map((p) => p.close));
        }
      } catch {
        if (!cancelled) setHistoryCloses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, activeRange]);

  const quote = getQuote(symbol);
  const isFav = isFavorite(symbol);

  const snapshot = useMemo(() => {
    if (!quote) {
      return {
        symbol,
        name: symbol,
        price: 0,
        changePercent: 0,
        source: 'unknown',
        isStale: false,
        updatedAt: '',
      };
    }

    return {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      changePercent: quote.changePercent,
      source: quote.source,
      isStale: quote.isStale,
      updatedAt: quote.updatedAt,
    };
  }, [quote, symbol]);

  const isPositive = snapshot.changePercent >= 0;
  const sentimentColor = isPositive ? colors.sentiment.bull_green : colors.sentiment.bear_red;
  const sign = isPositive ? '+' : '';
  const dataBadge = toDataBadge(snapshot.source, snapshot.isStale);
  const badgeUi = badgeStyle(dataBadge);

  const handleToggleFavorite = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        !isFav ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
    }
    toggleFavorite({ symbol: snapshot.symbol, name: snapshot.name });
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <View style={styles.blurHeaderWrap}>
        <BlurView intensity={60} tint="dark" style={[styles.blurHeader, { paddingTop: insets.top + 8 }]}>
          <Box row justify="space-between" align="center" style={styles.headerContent}>
            <Pressable hitSlop={20} onPress={() => navigation?.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Box center style={styles.iconBtn}>
                <ArrowLeft color={colors.text.primary} size={20} />
              </Box>
            </Pressable>
            <Box row align="center">
              <Pressable
                onPress={() => navigation.navigate('CompareAssets')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('common:compare')}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: spacing.md }]}
              >
                <ArrowLeftRight color={colors.text.secondary} size={22} />
              </Pressable>
              <Pressable onPress={handleToggleFavorite} hitSlop={15} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <Star
                  color={isFav ? colors.accent.premium_gold : colors.text.muted}
                  fill={isFav ? colors.accent.premium_gold : 'transparent'}
                  size={24}
                  style={{ marginRight: spacing.md }}
                />
              </Pressable>
              <Pressable
                hitSlop={15}
                onPress={() =>
                  navigation.navigate('ShareCardStudio', { symbol: snapshot.symbol })
                }
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: spacing.md }]}
              >
                <Share2 color={colors.text.primary} size={22} />
              </Pressable>
              <Pressable
                hitSlop={15}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowAlertSheet(true);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <BellPlus color={colors.text.primary} size={24} />
              </Pressable>
            </Box>
          </Box>
        </BlurView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: insets.bottom + 120 }}
      >
        <Box padding={spacing.lg} style={{ alignItems: 'center' }}>
          <Box style={styles.badge}>
            <Text variant="caption" color={colors.text.secondary} weight="700" style={{ letterSpacing: 1.5 }}>
              {snapshot.name.toUpperCase()} ({snapshot.symbol})
            </Text>
          </Box>
          <Text
            variant="h1"
            style={{ fontSize: 56, letterSpacing: -2.5, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm }}
          >
            {formatCurrency(snapshot.price)}
          </Text>
          <Box row align="center" style={styles.percentagePill}>
            <Text weight="700" color={sentimentColor} style={{ fontSize: 16 }}>
              {sign}
              {snapshot.changePercent.toFixed(2)}%
            </Text>
            <Box style={[styles.dataBadge, badgeUi.container]}>
              <Text weight="700" color={badgeUi.textColor} style={{ fontSize: 10 }}>
                {dataBadge}
              </Text>
            </Box>
          </Box>
          <Text variant="caption" color={colors.text.muted} style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {t('common:source')}: {formatQuoteSourceLabel(snapshot.source)} · {t('common:lastUpdate')}:{' '}
            {formatQuoteTime(snapshot.updatedAt)}
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <LiveDataBadge symbol={snapshot.symbol} />
          </View>
        </Box>

        <Box
          row
          style={{
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <Pressable
            onPress={() =>
              navigation.navigate('TechnicalAnalysis', { symbol: snapshot.symbol })
            }
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text variant="caption" weight="700">
              Teknik Analiz
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              navigation.navigate('VolatilityCone', { symbol: snapshot.symbol })
            }
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text variant="caption" weight="700">
              Volatilite
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              navigation.navigate('SpreadDetector', { symbol: snapshot.symbol })
            }
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text variant="caption" weight="700">
              Spread
            </Text>
          </Pressable>
        </Box>

        <Animated.View entering={FadeInUp.duration(600).springify().damping(20)} style={styles.chartContainer}>
          <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.sm, paddingHorizontal: spacing.lg }}>
            {t('asset:priceChart')}
          </Text>
          <Box style={{ alignItems: 'center' }}>
            <PriceLineChart closes={historyCloses} stroke={sentimentColor} height={200} />
          </Box>
          <Text variant="caption" color={colors.text.muted} style={{ marginTop: spacing.sm, paddingHorizontal: spacing.lg }}>
            {t('asset:dataFromYahoo')}
          </Text>
        </Animated.View>

        <Box padding={spacing.lg}>
          <RangeSelector ranges={RANGES} activeRange={activeRange} onChange={setActiveRange} />

          <PositionSummaryCard
            quantity={'--'}
            avgCost={'--'}
            currentValue={formatCurrency(snapshot.price)}
            unrealizedPnl={'--'}
            unrealizedPercent={snapshot.changePercent}
          />

          <View style={{ marginTop: spacing.md }}>
            <DeepCardSection symbol={snapshot.symbol} label={snapshot.name} />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <AssetSocialProof symbol={snapshot.symbol} />
          </View>

          <AISummaryCard
            summary="Live quote stream connected. Position-level analytics will become exact once transaction portfolio backend is fully integrated."
            actionText="View All Insights"
            onPressAction={() => navigation.navigate('Insights')}
          />
        </Box>
      </ScrollView>

      <Animated.View entering={FadeInDown.duration(800).springify().damping(15)} style={[styles.floatingActionBox, { bottom: insets.bottom + 16 }]}>
        <BlurView intensity={70} tint="dark" style={styles.blurActionWrapper}>
          <LinearGradient
            colors={['rgba(74, 92, 130, 0.95)', 'rgba(40, 52, 75, 0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Pressable
              style={({ pressed }) => [{ flex: 1, padding: spacing.lg, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
            >
              <Box row center align="center">
                <Zap color={colors.background.base} size={20} fill={colors.background.base} style={{ marginRight: spacing.sm }} />
                <Text variant="h3" weight="700" color={colors.background.base} style={{ fontSize: 18 }}>
                  Insta-Trade {snapshot.symbol}
                </Text>
              </Box>
            </Pressable>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      <CreateAlertSheet
        visible={showAlertSheet}
        onClose={() => setShowAlertSheet(false)}
        initialAsset={{ id: snapshot.symbol.toLowerCase(), symbol: snapshot.symbol, name: snapshot.name, type: 'crypto' }}
      />
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
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chartContainer: {
    width: '100%',
    marginVertical: spacing.md,
    paddingBottom: spacing.sm,
  },
  floatingActionBox: {
    position: 'absolute',
    bottom: 30,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: colors.accent.primary_blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  blurActionWrapper: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ctaGradient: {
    borderRadius: radius.pill,
  },
  blurHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  blurHeader: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
  },
  percentagePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dataBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeLive: {
    backgroundColor: 'rgba(59,217,132,0.1)',
    borderColor: 'rgba(59,217,132,0.25)',
  },
  badgeDerived: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeStale: {
    backgroundColor: 'rgba(255,92,92,0.1)',
    borderColor: 'rgba(255,92,92,0.25)',
  },
});
