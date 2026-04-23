import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AlertTriangle, Info, SlidersHorizontal } from 'lucide-react-native';
import { AssetRow } from '../../components/ui/AssetRow';
import { Box } from '../../components/ui/Box';
import { CategoryTabs } from '../../components/ui/CategoryTabs';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import { useMarketDataStore, type AssetCategory, type MarketQuote } from '../../store/useMarketDataStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { colors, spacing } from '../../theme';
import { formatCurrencyByLocale } from '../../utils/localeFormat';

type DisplayCurrency = 'USD' | 'EUR' | 'TRY';
const DISPLAY_CURRENCIES: DisplayCurrency[] = ['USD', 'EUR', 'TRY'];
const BASE_CURRENCY_BY_SYMBOL: Record<string, DisplayCurrency> = {
  USDKG: 'USD',
  PLATINUSD: 'USD',
  PALADYUMUSD: 'USD',
  ONS: 'USD',
  GUMUSUSD: 'USD',
  EURKG: 'EUR',
  GRAMALTIN: 'TRY',
  HASALTIN: 'TRY',
  AYAR22: 'TRY',
  AYAR14: 'TRY',
  CEYREKYENI: 'TRY',
  CEYREKESKI: 'TRY',
  YARIMYENI: 'TRY',
  YARIMESKI: 'TRY',
  TAMYENI: 'TRY',
  TAMESKI: 'TRY',
  ATAYENI: 'TRY',
  ATAESKI: 'TRY',
  ATA5YENI: 'TRY',
  ATA5ESKI: 'TRY',
  GREMSEYENI: 'TRY',
  GREMSEESKI: 'TRY',
  GUMUSTL: 'TRY',
};

function toDataBadge(
  item: MarketQuote & { hasQuote?: boolean },
): 'LIVE' | 'DERIVED' | 'STALE' | undefined {
  // Catalog placeholder (no quote yet) — no badge, prevents showing a
  // misleading "LIVE" pill on an empty row.
  if (item.hasQuote === false) {
    return undefined;
  }
  if (item.isStale) {
    return 'STALE';
  }
  if (item.source.toLowerCase().startsWith('derived')) {
    return 'DERIVED';
  }
  return 'LIVE';
}

export const MarketsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const categories = useMemo<Array<{ id: 'favorites' | AssetCategory; label: string }>>(
    () => [
      { id: 'favorites', label: t('marketsScreen.favorites') },
      { id: 'crypto', label: t('marketsScreen.crypto') },
      { id: 'forex', label: t('marketsScreen.forex') },
      { id: 'metals', label: t('marketsScreen.metals') },
    ],
    [t]
  );
  const [activeTab, setActiveTab] = useState<'favorites' | AssetCategory>('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [showGainersOnly, setShowGainersOnly] = useState(false);

  const {
    isLoading,
    isConnected,
    error: marketError,
    initializeRealtime,
    fetchQuotes,
    getAssetCatalog,
    getQuote,
    clearError: clearMarketError,
  } = useMarketDataStore();

  const {
    toggleFavorite,
    favorites,
    fetchWatchlist,
    error: watchlistError,
    clearError: clearWatchlistError,
  } = useWatchlistStore();

  const mergedError = marketError ?? watchlistError;
  const assetCatalog = getAssetCatalog();
  const cryptoSymbols = useMemo(
    () => assetCatalog.filter((asset) => asset.category === 'crypto').map((asset) => asset.symbol),
    [assetCatalog]
  );
  const usdTry = getQuote('USDTRY')?.price ?? null;
  const eurUsd = getQuote('EURUSD')?.price ?? null;

  useEffect(() => {
    initializeRealtime();
    fetchQuotes(cryptoSymbols);
    fetchWatchlist();
  }, [cryptoSymbols, fetchQuotes, fetchWatchlist, initializeRealtime]);

  const activeTabSymbols = useMemo(() => {
    if (activeTab === 'favorites') {
      return Object.keys(favorites);
    }
    return assetCatalog
      .filter((asset) => asset.category === activeTab)
      .map((asset) => asset.symbol);
  }, [activeTab, assetCatalog, favorites]);

  useEffect(() => {
    if (activeTabSymbols.length === 0) {
      return;
    }
    const missingSymbols = activeTabSymbols.filter((symbol) => !getQuote(symbol));
    if (missingSymbols.length > 0) {
      fetchQuotes(missingSymbols);
    }
  }, [activeTabSymbols, fetchQuotes, getQuote]);

  // Always project every asset from the catalog for the active tab so rare
  // symbols (gram altın, çeyrek, ata, gümüş TL, platin/ons variants) stay
  // visible even if the backend temporarily lacks a price. When a quote is
  // missing we render a neutral placeholder instead of dropping the row.
  const fallbackTabData = useMemo(() => {
    const metaForTab =
      activeTab === 'favorites'
        ? assetCatalog.filter((asset) => favorites[asset.symbol.toUpperCase()])
        : assetCatalog.filter((asset) => asset.category === activeTab);

    const normalizedSearch = searchQuery.trim().toLowerCase();

    let rows = metaForTab.map((asset) => {
      const liveQuote = getQuote(asset.symbol);
      const hasQuote = Boolean(liveQuote);
      return {
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category,
        price: liveQuote?.price ?? 0,
        changePercent: liveQuote?.changePercent ?? 0,
        source: liveQuote?.source ?? 'pending',
        // Only treat as stale when backend explicitly flags it. Missing
        // quotes are "pending" (placeholder), not stale.
        isStale: Boolean(liveQuote?.isStale),
        updatedAt: liveQuote?.updatedAt ?? new Date().toISOString(),
        favorite: !!favorites[asset.symbol.toUpperCase()],
        hasQuote,
      };
    });

    if (normalizedSearch) {
      rows = rows.filter((item) => {
        return (
          item.symbol.toLowerCase().includes(normalizedSearch) ||
          item.name.toLowerCase().includes(normalizedSearch)
        );
      });
    }

    if (showLiveOnly) {
      rows = rows.filter(
        (item) => item.hasQuote && !item.isStale && !item.source.toLowerCase().startsWith('derived'),
      );
    }

    if (showGainersOnly) {
      rows = rows.filter((item) => item.changePercent > 0);
    }

    return rows;
  }, [activeTab, assetCatalog, favorites, getQuote, searchQuery, showGainersOnly, showLiveOnly]);

  const renderSkeletons = () => (
    <Box padding={spacing.lg}>
      {[1, 2, 3, 4, 5].map((i) => (
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

  const handleToggleFavorite = useCallback(
    (item: { symbol: string; name: string }) => {
      toggleFavorite({ symbol: item.symbol, name: item.name });
    },
    [toggleFavorite],
  );

  const keyExtractor = useCallback((item: (typeof fallbackTabData)[number]) => item.symbol, []);

  const formatMarketPrice = useCallback(
    (item: MarketQuote): string => {
      if (item.category === 'forex') {
        if (item.price <= 0) {
          return '-';
        }
        return item.price.toFixed(4);
      }

      const symbol = item.symbol.toUpperCase();
      let baseCurrency: DisplayCurrency = BASE_CURRENCY_BY_SYMBOL[symbol] ?? 'USD';

      if (!BASE_CURRENCY_BY_SYMBOL[symbol] && (symbol.endsWith('TRY') || symbol.includes('TL'))) {
        baseCurrency = 'TRY';
      } else if (!BASE_CURRENCY_BY_SYMBOL[symbol] && symbol.startsWith('EUR')) {
        baseCurrency = 'EUR';
      }

      let converted = item.price;
      if (baseCurrency !== displayCurrency) {
        if (baseCurrency === 'USD' && displayCurrency === 'TRY') {
          if (!usdTry) return '-';
          converted = item.price * usdTry;
        } else if (baseCurrency === 'USD' && displayCurrency === 'EUR') {
          if (!eurUsd) return '-';
          converted = item.price / eurUsd;
        } else if (baseCurrency === 'TRY' && displayCurrency === 'USD') {
          if (!usdTry || usdTry === 0) return '-';
          converted = item.price / usdTry;
        } else if (baseCurrency === 'TRY' && displayCurrency === 'EUR') {
          if (!usdTry || !eurUsd || usdTry === 0) return '-';
          converted = item.price / usdTry / eurUsd;
        } else if (baseCurrency === 'EUR' && displayCurrency === 'USD') {
          if (!eurUsd) return '-';
          converted = item.price * eurUsd;
        } else if (baseCurrency === 'EUR' && displayCurrency === 'TRY') {
          if (!eurUsd || !usdTry) return '-';
          converted = item.price * eurUsd * usdTry;
        }
      }

      if (!Number.isFinite(converted) || converted <= 0) {
        return '-';
      }

      const currencyCode = displayCurrency === 'TRY' ? 'TRY' : displayCurrency;
      return formatCurrencyByLocale(converted, currencyCode, 2);
    },
    [displayCurrency, usdTry, eurUsd],
  );

  const renderMarketItem = useCallback(
    ({ item }: { item: (typeof fallbackTabData)[number] }) => (
      <AssetRow
        symbol={item.symbol}
        name={item.name}
        price={formatMarketPrice(item as MarketQuote)}
        priceValue={Number(item.price) || 0}
        changePercent={item.changePercent}
        dataBadge={toDataBadge(item as MarketQuote)}
        source={item.source}
        updatedAt={item.updatedAt}
        isConnected={isConnected}
        isFavorite={item.favorite}
        onFavoritePress={() => handleToggleFavorite(item)}
        onPress={() => navigation.navigate('AssetDetail', { symbol: item.symbol })}
      />
    ),
    [isConnected, handleToggleFavorite, navigation, formatMarketPrice],
  );

  return (
    <Box flex={1} bg={colors.background.base}>
      <Box style={{ marginTop: spacing.xxl + 20, paddingHorizontal: spacing.lg }}>
        <Text variant="h1" style={{ fontSize: 32, letterSpacing: -1, marginBottom: spacing.sm }}>
          {t('marketsScreen.title')}
        </Text>

        <Box row style={{ marginBottom: spacing.md }}>
          <Pressable onPress={() => navigation.navigate('CompareAssets')} style={{ marginRight: spacing.md }}>
            <Text variant="caption" weight="600" color={colors.accent.primary_blue}>
              {t('common:compare')}
            </Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('MarketNews')}>
            <Text variant="caption" weight="600" color={colors.accent.primary_blue}>
              {t('common:news')}
            </Text>
          </Pressable>
        </Box>

        <Box row align="center" style={{ marginBottom: spacing.md }}>
          <Input
            withSearch
            placeholder={t('marketsScreen.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Pressable
            onPress={() => setIsFilterModalOpen(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Box
              center
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <SlidersHorizontal color={colors.text.primary} size={20} />
            </Box>
          </Pressable>
        </Box>
      </Box>

      <Box style={{ marginBottom: spacing.sm }}>
        <CategoryTabs categories={categories} activeId={activeTab} onChange={(id) => setActiveTab(id as 'favorites' | AssetCategory)} />
      </Box>

      {activeTab !== 'forex' && (
        <Box row style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
          {DISPLAY_CURRENCIES.map((currency) => {
            const isActive = displayCurrency === currency;
            return (
              <Pressable key={currency} onPress={() => setDisplayCurrency(currency)} style={{ marginRight: spacing.sm }}>
                <Box
                  center
                  style={{
                    paddingHorizontal: spacing.md,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  }}
                >
                  <Text variant="caption" weight={isActive ? '600' : '500'} color={isActive ? colors.text.primary : colors.text.secondary}>
                    {currency}
                  </Text>
                </Box>
              </Pressable>
            );
          })}
        </Box>
      )}

      {mergedError && (
        <Pressable
          onPress={() => {
            clearMarketError();
            clearWatchlistError();
          }}
        >
          <Box
            row
            align="center"
            style={{
              marginHorizontal: spacing.lg,
              marginBottom: spacing.sm,
              padding: spacing.sm,
              backgroundColor: 'rgba(255,92,92,0.1)',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,92,92,0.2)',
            }}
          >
            <AlertTriangle color={colors.sentiment.bear_red} size={16} style={{ marginRight: spacing.sm }} />
            <Text variant="caption" color={colors.sentiment.bear_red} style={{ flex: 1 }}>
              {t('marketsScreen.errorRefreshHint', { error: mergedError })}
            </Text>
            <Text variant="caption" color={colors.text.muted}>
              {t('common.clear')}
            </Text>
          </Box>
        </Pressable>
      )}

      {isLoading ? (
        renderSkeletons()
      ) : fallbackTabData.length === 0 ? (
        <Box padding={spacing.lg}>
          <GuidedStateCard
            title={t('marketsScreen.searchEmpty')}
            description={t('marketsScreen.searchEmptyDesc', 'Filtreleri temizleyerek veya başka bir kategori seçerek tekrar deneyin.')}
            ctaLabel={t('common.clear')}
            onPress={() => { setSearchQuery(''); setShowLiveOnly(false); setShowGainersOnly(false); }}
            icon={<Info color={colors.text.muted} size={32} />}
          />
        </Box>
      ) : (
        <Animated.View entering={FadeInUp.duration(400).springify()} style={{ flex: 1 }}>
          <FlashList
            data={fallbackTabData}
            keyExtractor={keyExtractor}
            renderItem={renderMarketItem}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      <Modal visible={isFilterModalOpen} transparent animationType="fade" onRequestClose={() => setIsFilterModalOpen(false)}>
        <Pressable
          onPress={() => setIsFilterModalOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: 'rgba(17,19,26,0.72)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: spacing.lg,
              overflow: 'hidden',
            }}
          >
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill as any} />
            <LinearGradient
              colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.5 }}
              style={StyleSheet.absoluteFill as any}
            />
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}
            />
            <Text variant="h3" weight="700" style={{ marginBottom: spacing.md }}>
              {t('common.filter')}
            </Text>

            <Pressable
              onPress={() => setShowLiveOnly((prev) => !prev)}
              style={{ marginBottom: spacing.sm }}
            >
              <Box
                row
                justify="space-between"
                align="center"
                style={{
                  padding: spacing.md,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Text variant="body">{t('marketsScreen.liveOnly', 'Only live quotes')}</Text>
                <Text variant="caption" weight="700" color={showLiveOnly ? colors.sentiment.bull_green : colors.text.muted}>
                  {showLiveOnly ? t('common.on', 'ON') : t('common.off', 'OFF')}
                </Text>
              </Box>
            </Pressable>

            <Pressable
              onPress={() => setShowGainersOnly((prev) => !prev)}
              style={{ marginBottom: spacing.md }}
            >
              <Box
                row
                justify="space-between"
                align="center"
                style={{
                  padding: spacing.md,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Text variant="body">{t('marketsScreen.gainersOnly', 'Only gainers')}</Text>
                <Text variant="caption" weight="700" color={showGainersOnly ? colors.sentiment.bull_green : colors.text.muted}>
                  {showGainersOnly ? t('common.on', 'ON') : t('common.off', 'OFF')}
                </Text>
              </Box>
            </Pressable>

            <Box row style={{ gap: spacing.sm }}>
              <Pressable onPress={() => { setShowLiveOnly(false); setShowGainersOnly(false); }} style={{ flex: 1 }}>
                <Box
                  center
                  style={{
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Text variant="caption" weight="700" color={colors.text.secondary}>
                    {t('common.clear')}
                  </Text>
                </Box>
              </Pressable>
              <Pressable onPress={() => setIsFilterModalOpen(false)} style={{ flex: 1 }}>
                <Box
                  center
                  style={{
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(59,217,132,0.28)',
                    backgroundColor: 'rgba(59,217,132,0.16)',
                  }}
                >
                  <Text variant="caption" weight="700" color={colors.sentiment.bull_green}>
                    {t('common.done', 'Done')}
                  </Text>
                </Box>
              </Pressable>
            </Box>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
};
