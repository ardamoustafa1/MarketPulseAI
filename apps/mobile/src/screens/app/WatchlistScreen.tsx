import React, { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, Platform, Pressable, Share } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { AssetRow } from '../../components/ui/AssetRow';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { colors, spacing } from '../../theme';
import { Star, AlertTriangle, Share2 } from 'lucide-react-native';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { useShareStore } from '../../store/useShareStore';
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
  const { initializeRealtime, fetchQuotes, getQuote, isConnected } = useMarketDataStore();
  const createShare = useShareStore((s) => s.createWatchlistShare);

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

  const handleToggle = useCallback(
    (item: { symbol: string; name?: string }) => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      toggleFavorite({ symbol: item.symbol, name: item.name });
    },
    [toggleFavorite],
  );

  const keyExtractor = useCallback((item: (typeof favoriteArray)[number]) => item.symbol, []);

  const renderWatchlistItem = useCallback(
    ({ item }: { item: (typeof favoriteArray)[number] }) => {
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
          priceValue={liveQuote ? Number(liveQuote.price) : Number(item.price) || 0}
          changePercent={changePercent}
          dataBadge={dataBadge}
          source={liveQuote?.source}
          updatedAt={liveQuote?.updatedAt}
          isConnected={isConnected}
          isFavorite={true}
          onFavoritePress={() => handleToggle(item)}
          onPress={() => navigation.navigate('AssetDetail', { symbol: item.symbol })}
        />
      );
    },
    [getQuote, handleToggle, isConnected, navigation],
  );

  const handleShare = async () => {
    if (favoriteArray.length === 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const payload = await createShare();
    if (!payload) return;
    await Share.share({
      title: t('watchlistScreen.shareTitle'),
      message: t('watchlistScreen.shareBody', {
        count: payload.asset_count,
        url: payload.share_url,
      }),
      url: payload.share_url,
    });
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
      <Box
        row
        justify="space-between"
        align="center"
        style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
      >
        <Text variant="h1" style={{ fontSize: 32, letterSpacing: -1 }}>{t('watchlistScreen.title')}</Text>
        {favoriteArray.length > 0 ? (
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={t('watchlistScreen.shareCta')}
            hitSlop={12}
            style={({ pressed }) => [{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Share2 color={colors.accent.premium_gold} size={18} />
          </Pressable>
        ) : null}
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

      {favoriteArray.length === 0 && !isLoading ? (
        <Box padding={spacing.lg}>
          {renderEmptyState()}
        </Box>
      ) : (
        <FlashList
          data={favoriteArray}
          keyExtractor={keyExtractor}
          renderItem={renderWatchlistItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.accent.premium_gold} />
          }
        />
      )}
    </Box>
  );
};
