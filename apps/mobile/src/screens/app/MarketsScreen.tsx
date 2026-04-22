import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AlertTriangle, Info, SlidersHorizontal } from 'lucide-react-native';
import { AssetRow } from '../../components/ui/AssetRow';
import { Box } from '../../components/ui/Box';
import { CategoryTabs } from '../../components/ui/CategoryTabs';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import { useMarketDataStore, type AssetCategory, type MarketQuote } from '../../store/useMarketDataStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { colors, spacing } from '../../theme';
import { formatQuoteSourceLabel, formatQuoteTime } from '../../utils/quoteLabels';
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

function toDataBadge(item: MarketQuote): 'LIVE' | 'DERIVED' | 'STALE' {
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

  const {
    isLoading,
    error: marketError,
    initializeRealtime,
    fetchQuotes,
    getAssetCatalog,
    getQuotesForCategory,
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

  const baseQuotes = getQuotesForCategory(activeTab === 'favorites' ? 'favorites' : activeTab);
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

  const filteredData = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const enriched = baseQuotes.map((quote) => ({
      ...quote,
      favorite: !!favorites[quote.symbol.toUpperCase()],
    }));

    const tabFiltered =
      activeTab === 'favorites' ? enriched.filter((item) => item.favorite) : enriched;

    if (!normalizedSearch) {
      return tabFiltered;
    }

    return tabFiltered.filter((item) => {
      return (
        item.symbol.toLowerCase().includes(normalizedSearch) ||
        item.name.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [activeTab, baseQuotes, favorites, searchQuery]);

  const fallbackTabData = useMemo(() => {
    if (filteredData.length > 0 || searchQuery.trim().length > 0) {
      return filteredData;
    }

    const metaForTab =
      activeTab === 'favorites'
        ? assetCatalog.filter((asset) => favorites[asset.symbol.toUpperCase()])
        : assetCatalog.filter((asset) => asset.category === activeTab);

    return metaForTab.map((asset) => {
      const liveQuote = getQuote(asset.symbol);
      return {
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category,
        price: liveQuote?.price ?? 0,
        changePercent: liveQuote?.changePercent ?? 0,
        source: liveQuote?.source ?? 'unavailable',
        isStale: liveQuote?.isStale ?? true,
        updatedAt: liveQuote?.updatedAt ?? new Date().toISOString(),
        favorite: !!favorites[asset.symbol.toUpperCase()],
      };
    });
  }, [activeTab, assetCatalog, favorites, filteredData, getQuote, searchQuery]);

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

  const handleToggleFavorite = (item: MarketQuote) => {
    toggleFavorite({ symbol: item.symbol, name: item.name });
  };

  const formatMarketPrice = (item: MarketQuote): string => {
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
  };

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
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {isLoading ? (
          renderSkeletons()
        ) : (
          <Animated.View entering={FadeInUp.duration(400).springify()}>
            <Box padding={spacing.lg} style={{ paddingTop: 0 }}>
              {fallbackTabData.length === 0 ? (
                <Box center style={{ marginTop: spacing.xxl }}>
                  <Info color={colors.text.muted} size={32} style={{ marginBottom: spacing.md }} />
                  <Text variant="h3" color={colors.text.secondary}>
                    {t('marketsScreen.searchEmpty')}
                  </Text>
                </Box>
              ) : (
                fallbackTabData.map((item) => (
                  <AssetRow
                    key={item.symbol}
                    symbol={item.symbol}
                    name={item.name}
                    price={formatMarketPrice(item)}
                    changePercent={item.changePercent}
                    dataBadge={toDataBadge(item)}
                    meta={`${formatQuoteSourceLabel(item.source)} · ${formatQuoteTime(item.updatedAt)}`}
                    isFavorite={item.favorite}
                    onFavoritePress={() => handleToggleFavorite(item)}
                    onPress={() => navigation.navigate('AssetDetail', { symbol: item.symbol })}
                  />
                ))
              )}

              <Box style={{ height: 40 }} />
            </Box>
          </Animated.View>
        )}
      </ScrollView>
    </Box>
  );
};
