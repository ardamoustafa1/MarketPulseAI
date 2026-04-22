import React, { useEffect, useMemo } from 'react';
import { ScrollView, View, RefreshControl, Platform, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { AssetRow } from '../../components/ui/AssetRow';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { colors, spacing } from '../../theme';
import { Star, AlertTriangle } from 'lucide-react-native';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import * as Haptics from 'expo-haptics';
import { formatCurrencyByLocale } from '../../utils/localeFormat';
import { useTranslation } from 'react-i18next';

function toDataBadge(source?: string, isStale?: boolean): 'LIVE' | 'DERIVED' | 'STALE' {
  if (isStale) {
    return 'STALE';
  }
  if ((source ?? '').toLowerCase().startsWith('derived')) {
    return 'DERIVED';
  }
  return 'LIVE';
}

export const WatchlistScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { fetchWatchlist, favorites, isLoading, error, toggleFavorite, clearError } = useWatchlistStore();
  const { initializeRealtime, fetchQuotes, getQuote } = useMarketDataStore();

  useEffect(() => {
    initializeRealtime();
    fetchQuotes();
    fetchWatchlist();
  }, [fetchQuotes, fetchWatchlist, initializeRealtime]);

  const favoriteArray = useMemo(() => Object.values(favorites), [favorites]);

  const onRefresh = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchWatchlist();
  };

  const handleToggle = (item: any) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite({ symbol: item.symbol, name: item.name });
  };

  const renderEmptyState = () => (
    <Animated.View entering={FadeInDown.duration(600).springify()}>
      <GuidedStateCard
        title={t('watchlistScreen.emptyTitle')}
        description={t('watchlistScreen.emptyDesc')}
        ctaLabel={t('watchlistScreen.emptyCta')}
        onPress={() => navigation.navigate('Tabs', { screen: 'Markets' })}
        icon={<Star color={colors.accent.premium_gold} size={32} />}
      />
    </Animated.View>
  );

  return (
    <Box flex={1} bg={colors.background.base}>
      <Box style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Text variant="h1" style={{ fontSize: 32, letterSpacing: -1 }}>{t('watchlistScreen.title')}</Text>
      </Box>

      {/* Error Banner */}
      {error && (
        <Pressable onPress={clearError}>
          <Box row align="center" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.sm, backgroundColor: 'rgba(255,92,92,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,92,92,0.2)' }}>
            <AlertTriangle color={colors.sentiment.bear_red} size={16} style={{ marginRight: spacing.sm }} />
            <Text variant="caption" color={colors.sentiment.bear_red} style={{ flex: 1 }}>
              {t('watchlistScreen.errorHint', { error })}
            </Text>
            <Text variant="caption" color={colors.text.muted}>{t('common.tapToDismiss')}</Text>
          </Box>
        </Pressable>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.accent.premium_gold} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        <Box padding={spacing.lg}>
          {favoriteArray.length === 0 && !isLoading ? (
            renderEmptyState()
          ) : (
            <Animated.View entering={FadeInUp.duration(400).springify()}>
              {favoriteArray.map((item) => (
                <View key={item.symbol} style={{ marginBottom: spacing.sm }}>
                  {(() => {
                    const liveQuote = getQuote(item.symbol);
                    const priceText = liveQuote
                      ? formatCurrencyByLocale(liveQuote.price, 'USD')
                      : item.price
                        ? formatCurrencyByLocale(item.price, 'USD')
                        : '—';
                    const changePercent = liveQuote ? liveQuote.changePercent : item.change_24h_percent || 0.0;
                    const dataBadge = liveQuote ? toDataBadge(liveQuote.source, liveQuote.isStale) : undefined;
                    return (
                  <AssetRow
                    symbol={item.symbol}
                    name={item.name || item.symbol}
                    price={priceText}
                    changePercent={changePercent}
                    dataBadge={dataBadge}
                    isFavorite={true}
                    onFavoritePress={() => handleToggle(item)}
                    onPress={() => navigation.navigate('AssetDetail', { symbol: item.symbol })}
                  />
                    );
                  })()}
                </View>
              ))}
            </Animated.View>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};
