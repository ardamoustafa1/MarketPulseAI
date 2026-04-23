import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { ArrowDownUp, ChevronDown, Copy, Search, Star } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { formatNumberByLocale } from '../../utils/localeFormat';

type AssetOption = {
  symbol: string;
  name: string;
};

type Pair = {
  from: string;
  to: string;
};

const FAVORITES_KEY = 'converter_favorite_pairs';
const PAIR_USAGE_KEY = 'converter_pair_usage';
const MAX_DYNAMIC_QUICK_PAIRS = 8;

const QUICK_PAIRS: Pair[] = [
  { from: 'USD', to: 'TRY' },
  { from: 'EUR', to: 'TRY' },
  { from: 'GBP', to: 'TRY' },
  { from: 'XAU', to: 'TRY' },
  { from: 'GRAMALTIN', to: 'TRY' },
  { from: 'BTC', to: 'ETH' },
];

const TRY_DERIVED_SYMBOLS = new Set([
  'GRAMALTIN',
  'HASALTIN',
  'AYAR22',
  'AYAR14',
  'CEYREKYENI',
  'CEYREKESKI',
  'YARIMYENI',
  'YARIMESKI',
  'TAMYENI',
  'TAMESKI',
  'ATAYENI',
  'ATAESKI',
  'ATA5YENI',
  'ATA5ESKI',
  'GREMSEYENI',
  'GREMSEESKI',
  'GUMUSTL',
]);

function inferUsdPerUnit(
  symbol: string,
  getQuote: (input: string) => { price: number; source: string; isStale: boolean } | null
): number | null {
  const quote = getQuote(symbol);
  if (!quote || quote.price <= 0) {
    return null;
  }

  if (symbol === 'ALTINGUMUS') {
    return null;
  }

  if (/^USD[A-Z]{3}$/.test(symbol)) {
    return quote.price > 0 ? 1 / quote.price : null;
  }

  if (/^[A-Z]{3}USD$/.test(symbol)) {
    return quote.price;
  }

  if (symbol === 'USDKG' || symbol === 'GUMUSUSD' || symbol === 'PLATINUSD' || symbol === 'PALADYUMUSD') {
    return quote.price;
  }

  if (symbol === 'EURKG') {
    const eurusd = getQuote('EURUSD');
    if (!eurusd || eurusd.price <= 0) {
      return null;
    }
    return quote.price * eurusd.price;
  }

  if (TRY_DERIVED_SYMBOLS.has(symbol)) {
    const usdtry = getQuote('USDTRY');
    if (!usdtry || usdtry.price <= 0) {
      return null;
    }
    return quote.price / usdtry.price;
  }

  return quote.price;
}

const SourceBadge = ({ symbol }: { symbol: string }) => {
  const quote = useMarketDataStore((state) => state.getQuote(symbol));
  const dependencyQuote = useMarketDataStore((state) => {
    if (symbol === 'TRY') return state.getQuote('USDTRY');
    if (symbol === 'EUR') return state.getQuote('EURUSD');
    if (symbol === 'GBP') return state.getQuote('GBPUSD');
    return null;
  });

  let label: 'LIVE' | 'DERIVED' | 'STALE' = 'DERIVED';
  const effective = quote ?? dependencyQuote;
  if (effective?.isStale) {
    label = 'STALE';
  } else if ((effective?.source ?? '').toLowerCase().startsWith('derived') || !quote) {
    label = 'DERIVED';
  } else {
    label = 'LIVE';
  }

  const badgeStyle =
    label === 'LIVE'
      ? styles.badgeLive
      : label === 'DERIVED'
        ? styles.badgeDerived
        : styles.badgeStale;
  const textColor =
    label === 'LIVE'
      ? colors.sentiment.bull_green
      : label === 'DERIVED'
        ? colors.text.secondary
        : colors.sentiment.bear_red;

  return (
    <Box style={[styles.badge, badgeStyle]}>
      <Text variant="caption" weight="700" color={textColor} style={{ fontSize: 10 }}>
        {label}
      </Text>
    </Box>
  );
};

export const ConverterScreen = () => {
  const { t } = useTranslation();
  const {
    initializeRealtime,
    fetchQuotes,
    getAssetCatalog,
    getQuote,
  } = useMarketDataStore();

  const [amountInput, setAmountInput] = useState('10');
  const [fromSymbol, setFromSymbol] = useState('USD');
  const [toSymbol, setToSymbol] = useState('TRY');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to'>('from');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritePairs, setFavoritePairs] = useState<Pair[]>([]);
  const [pairUsage, setPairUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    initializeRealtime();
    fetchQuotes();
  }, [initializeRealtime, fetchQuotes]);

  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const [favoritesRaw, usageRaw] = await Promise.all([
          SecureStore.getItemAsync(FAVORITES_KEY),
          SecureStore.getItemAsync(PAIR_USAGE_KEY),
        ]);

        if (favoritesRaw) {
          const parsedFavorites = JSON.parse(favoritesRaw);
          if (Array.isArray(parsedFavorites)) {
            const sanitized = parsedFavorites.filter(
              (item) => typeof item?.from === 'string' && typeof item?.to === 'string'
            ) as Pair[];
            setFavoritePairs(sanitized);
          }
        }

        if (usageRaw) {
          const parsedUsage = JSON.parse(usageRaw);
          if (parsedUsage && typeof parsedUsage === 'object' && !Array.isArray(parsedUsage)) {
            const sanitizedUsage = Object.entries(parsedUsage).reduce<Record<string, number>>(
              (acc, [key, value]) => {
                if (typeof key === 'string' && typeof value === 'number' && Number.isFinite(value) && value > 0) {
                  acc[key] = value;
                }
                return acc;
              },
              {}
            );
            setPairUsage(sanitizedUsage);
          }
        }
      } catch {
        setFavoritePairs([]);
        setPairUsage({});
      }
    };

    loadPersistedData();
  }, []);

  const options = useMemo<AssetOption[]>(() => {
    const base = getAssetCatalog().map((item) => ({ symbol: item.symbol, name: item.name }));
    const synthetic = [
      { symbol: 'USD', name: 'US Dollar (base)' },
      { symbol: 'TRY', name: 'Turkish Lira (synthetic)' },
      { symbol: 'EUR', name: 'Euro (synthetic)' },
      { symbol: 'GBP', name: 'British Pound (synthetic)' },
    ];
    const combined = [...synthetic, ...base];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item.symbol)) {
        return false;
      }
      seen.add(item.symbol);
      return true;
    });
  }, [getAssetCatalog]);

  const filteredOptions = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter(
      (item) =>
        item.symbol.toLowerCase().includes(needle) ||
        item.name.toLowerCase().includes(needle)
    );
  }, [options, searchQuery]);

  const amount = Number(amountInput.replace(',', '.'));

  const trackPairUsage = async (pair: Pair) => {
    const key = `${pair.from}->${pair.to}`;
    setPairUsage((prev) => {
      const next = { ...prev, [key]: (prev[key] ?? 0) + 1 };
      void SecureStore.setItemAsync(PAIR_USAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const usdPerFrom = useMemo(() => {
    if (fromSymbol === 'USD') return 1;
    if (fromSymbol === 'TRY') {
      const usdtry = getQuote('USDTRY');
      return usdtry && usdtry.price > 0 ? 1 / usdtry.price : null;
    }
    if (fromSymbol === 'EUR') {
      const eurusd = getQuote('EURUSD');
      return eurusd && eurusd.price > 0 ? eurusd.price : null;
    }
    if (fromSymbol === 'GBP') {
      const gbpusd = getQuote('GBPUSD');
      return gbpusd && gbpusd.price > 0 ? gbpusd.price : null;
    }
    return inferUsdPerUnit(fromSymbol, getQuote as any);
  }, [fromSymbol, getQuote]);

  const usdPerTo = useMemo(() => {
    if (toSymbol === 'USD') return 1;
    if (toSymbol === 'TRY') {
      const usdtry = getQuote('USDTRY');
      return usdtry && usdtry.price > 0 ? 1 / usdtry.price : null;
    }
    if (toSymbol === 'EUR') {
      const eurusd = getQuote('EURUSD');
      return eurusd && eurusd.price > 0 ? eurusd.price : null;
    }
    if (toSymbol === 'GBP') {
      const gbpusd = getQuote('GBPUSD');
      return gbpusd && gbpusd.price > 0 ? gbpusd.price : null;
    }
    return inferUsdPerUnit(toSymbol, getQuote as any);
  }, [toSymbol, getQuote]);

  const result = useMemo(() => {
    if (!Number.isFinite(amount) || amount <= 0 || !usdPerFrom || !usdPerTo || usdPerTo <= 0) {
      return null;
    }
    return (amount * usdPerFrom) / usdPerTo;
  }, [amount, usdPerFrom, usdPerTo]);

  const handleSwap = () => {
    const swappedPair = { from: toSymbol, to: fromSymbol };
    setFromSymbol(swappedPair.from);
    setToSymbol(swappedPair.to);
    void trackPairUsage(swappedPair);
  };

  const openPicker = (target: 'from' | 'to') => {
    setPickerTarget(target);
    setSearchQuery('');
    setPickerVisible(true);
  };

  const selectSymbol = (symbol: string) => {
    let nextPair: Pair;
    if (pickerTarget === 'from') {
      nextPair = { from: symbol, to: toSymbol };
      setFromSymbol(symbol);
    } else {
      nextPair = { from: fromSymbol, to: symbol };
      setToSymbol(symbol);
    }
    setPickerVisible(false);
    void trackPairUsage(nextPair);
  };

  const setPair = (pair: Pair) => {
    setFromSymbol(pair.from);
    setToSymbol(pair.to);
    void trackPairUsage(pair);
  };

  const dynamicQuickPairs = useMemo<Pair[]>(() => {
    const usedPairs = Object.entries(pairUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_DYNAMIC_QUICK_PAIRS)
      .map(([key]) => {
        const [from, to] = key.split('->');
        return { from, to };
      })
      .filter((pair) => pair.from && pair.to);

    if (usedPairs.length > 0) {
      return usedPairs;
    }

    return QUICK_PAIRS.slice(0, MAX_DYNAMIC_QUICK_PAIRS);
  }, [pairUsage]);
  const hasUsageData = Object.keys(pairUsage).length > 0;

  const currentPairKey = `${fromSymbol}->${toSymbol}`;

  const isFavoritePair = useMemo(
    () => favoritePairs.some((pair) => `${pair.from}->${pair.to}` === currentPairKey),
    [favoritePairs, currentPairKey]
  );

  const toggleFavoritePair = async () => {
    const next = isFavoritePair
      ? favoritePairs.filter((pair) => `${pair.from}->${pair.to}` !== currentPairKey)
      : [{ from: fromSymbol, to: toSymbol }, ...favoritePairs].slice(0, 12);
    setFavoritePairs(next);
    await SecureStore.setItemAsync(FAVORITES_KEY, JSON.stringify(next));
  };

  const handleCopyResult = async () => {
    if (result === null) {
      return;
    }
    const value = `${amountInput} ${fromSymbol} = ${formatNumberByLocale(result, 8)} ${toSymbol}`;
    await Clipboard.setStringAsync(value);
    Alert.alert(t('converter.copied'), value);
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="h1" style={{ fontSize: 32, letterSpacing: -1, marginTop: spacing.xxl, marginBottom: spacing.lg }}>
              {t('converter.title')}
            </Text>

            <Box style={{ marginBottom: spacing.md }}>
              <Text
                variant="caption"
                weight="700"
                color={hasUsageData ? colors.accent.premium_gold : colors.text.secondary}
                style={{ marginBottom: spacing.xs }}
              >
                {hasUsageData ? t('converter.mostUsed') : t('converter.quickPairs')}
              </Text>
              <Box row style={{ gap: spacing.sm }}>
                {dynamicQuickPairs.map((pair) => (
                  <Pressable key={`${pair.from}-${pair.to}`} onPress={() => setPair(pair)}>
                    <Box style={styles.quickChip}>
                      <Text variant="caption" weight="600" color={colors.text.secondary}>
                        {pair.from}/{pair.to}
                      </Text>
                    </Box>
                  </Pressable>
                ))}
              </Box>
            </Box>

            {favoritePairs.length > 0 ? (
              <Box row style={{ marginBottom: spacing.md, gap: spacing.sm }}>
                {favoritePairs.map((pair) => (
                  <Pressable key={`fav-${pair.from}-${pair.to}`} onPress={() => setPair(pair)}>
                    <Box style={styles.favoriteChip}>
                      <Text variant="caption" weight="700" color={colors.accent.premium_gold}>
                        {pair.from}/{pair.to}
                      </Text>
                    </Box>
                  </Pressable>
                ))}
              </Box>
            ) : null}

            <Box style={styles.card}>
              <Text variant="caption" color={colors.text.secondary} style={styles.label}>{t('converter.amount')}</Text>
              <TextInput
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="decimal-pad"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                onEndEditing={Keyboard.dismiss}
                style={styles.amountInput}
                placeholder={t('converter.amountPlaceholder')}
                placeholderTextColor={colors.text.muted}
              />

              <Box row align="center" justify="space-between" style={{ marginTop: spacing.md }}>
                <Pressable onPress={() => openPicker('from')} style={styles.selectorBtn}>
                  <Box row align="center">
                    <Text variant="h3" weight="700">{fromSymbol}</Text>
                    <ChevronDown size={16} color={colors.text.secondary} style={{ marginLeft: 6 }} />
                  </Box>
                </Pressable>

                <Pressable onPress={handleSwap} style={styles.swapBtn}>
                  <ArrowDownUp size={18} color={colors.text.primary} />
                </Pressable>

                <Pressable onPress={() => openPicker('to')} style={styles.selectorBtn}>
                  <Box row align="center">
                    <Text variant="h3" weight="700">{toSymbol}</Text>
                    <ChevronDown size={16} color={colors.text.secondary} style={{ marginLeft: 6 }} />
                  </Box>
                </Pressable>
              </Box>

              <Box style={styles.resultBox}>
                <Box row justify="space-between" align="center">
                  <Text variant="caption" color={colors.text.secondary}>{t('converter.converted')}</Text>
                  <Box row align="center" style={{ gap: 8 }}>
                    <Pressable onPress={toggleFavoritePair}>
                      <Star
                        size={16}
                        color={isFavoritePair ? colors.accent.premium_gold : colors.text.muted}
                        fill={isFavoritePair ? colors.accent.premium_gold : 'transparent'}
                      />
                    </Pressable>
                    <Pressable onPress={handleCopyResult}>
                      <Copy size={16} color={colors.text.muted} />
                    </Pressable>
                  </Box>
                </Box>
                <Text variant="h1" weight="700" style={{ fontSize: 34, marginTop: 4 }}>
                  {result === null ? '--' : `${formatNumberByLocale(result, 8)} ${toSymbol}`}
                </Text>
              </Box>

              <Box row style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <SourceBadge symbol={fromSymbol} />
                <SourceBadge symbol={toSymbol} />
              </Box>
            </Box>

            <Box style={{ height: spacing.xl }} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      
      <Modal visible={pickerVisible} transparent animationType="slide">
        <Box flex={1} style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setPickerVisible(false)} />
          <Box style={styles.modalBody}>
            <Text variant="h3" weight="700" style={{ marginBottom: spacing.md }}>
              {t('converter.selectInstrument')}
            </Text>
            <Box row align="center" style={styles.searchBox}>
              <Search size={16} color={colors.text.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('converter.searchSymbol')}
                placeholderTextColor={colors.text.muted}
                style={styles.searchInput}
              />
            </Box>
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.symbol}
              renderItem={({ item }) => (
                <Pressable onPress={() => selectSymbol(item.symbol)} style={styles.optionRow}>
                  <Text variant="body" weight="600">{item.symbol}</Text>
                  <Text variant="caption" color={colors.text.secondary}>{item.name}</Text>
                </Pressable>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  favoriteChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(200,169,126,0.25)',
    backgroundColor: 'rgba(200,169,126,0.08)',
  },
  label: {
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  resultBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBody: {
    maxHeight: '75%',
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  searchBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    paddingVertical: 10,
    marginLeft: 8,
  },
  optionRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
});
