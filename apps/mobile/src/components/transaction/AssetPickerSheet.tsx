import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Pressable, Platform, Modal, TextInput, FlatList, Keyboard, ActivityIndicator, View } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';
import { Search, X, Check, TrendingUp, Layers, Gem } from 'lucide-react-native';
import { apiClient } from '../../api/client';
import { useMarketDataStore } from '../../store/useMarketDataStore';

export interface AssetItem {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'fiat' | 'metal';
  imageUrl?: string;
}

type FilterType = 'all' | 'crypto' | 'metal' | 'fiat';

interface AssetPickerSheetProps {
  visible: boolean;
  selectedId?: string;
  onSelect: (asset: AssetItem) => void;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  crypto: <TrendingUp color={colors.sentiment.bull_green} size={14} />,
  metal: <Gem color={colors.accent.premium_gold} size={14} />,
  fiat: <Layers color={colors.accent.primary_blue} size={14} />,
};

const BADGE_COLORS: Record<string, string> = {
  crypto: 'rgba(59,217,132,0.12)',
  metal: 'rgba(200,169,126,0.12)',
  fiat: 'rgba(74,92,130,0.12)',
};

export const AssetPickerSheet: React.FC<AssetPickerSheetProps> = ({
  visible, selectedId, onSelect, onClose
}) => {
  const insets = useSafeAreaInsets();
  const getAssetCatalog = useMarketDataStore((state) => state.getAssetCatalog);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackAssets = useMemo<AssetItem[]>(() => {
    const categoryMap: Record<string, AssetItem['type']> = {
      crypto: 'crypto',
      forex: 'fiat',
      metals: 'metal',
    };
    return getAssetCatalog().map((item) => ({
      id: item.symbol,
      symbol: item.symbol,
      name: item.name,
      type: categoryMap[item.category] ?? 'crypto',
    }));
  }, [getAssetCatalog]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    apiClient
      .get('/api/v1/assets')
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        const normalized = Array.isArray(data)
          ? data
              .filter((item: any) => item?.id && item?.symbol && item?.name && item?.type)
              .map((item: any) => ({
                id: String(item.id),
                symbol: String(item.symbol),
                name: String(item.name),
                type: String(item.type).toLowerCase() as AssetItem['type'],
                imageUrl: item.image_url ?? undefined,
              }))
          : [];

        setAssets(normalized);
        setIsLoading(false);
      })
      .catch((requestError: any) => {
        if (!isMounted) {
          return;
        }
        if (fallbackAssets.length > 0) {
          setAssets(fallbackAssets);
          setError(null);
        } else {
          setError(requestError?.response?.data?.detail || 'Failed to load assets.');
          setAssets([]);
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, fallbackAssets]);

  const filtered = useMemo(() => {
    let list = assets;
    if (filter !== 'all') {
      list = list.filter(a => a.type === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [assets, search, filter]);

  const handleSelect = (asset: AssetItem) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    onSelect(asset);
    setTimeout(() => { setSearch(''); setFilter('all'); }, 300);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
    setTimeout(() => { setSearch(''); setFilter('all'); }, 300);
  };

  const renderItem = ({ item, index }: { item: AssetItem; index: number }) => {
    const isSelected = item.id === selectedId;
    return (
      <Animated.View entering={FadeInUp.delay(index * 30).springify().damping(20)}>
        <Pressable
          onPress={() => handleSelect(item)}
          style={({ pressed }) => [
            styles.assetRow,
            pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
            isSelected && styles.assetRowSelected,
          ]}
        >
          <Box center style={[styles.assetBadge, { backgroundColor: BADGE_COLORS[item.type] ?? BADGE_COLORS.crypto }]}> 
            <Text variant="caption" weight="700" style={{ fontSize: 14, letterSpacing: 0.5 }}>
              {item.symbol.slice(0, 2)}
            </Text>
          </Box>

          <Box flex={1} style={{ marginLeft: spacing.md }}>
            <Box row align="center">
              <Text variant="body" weight="600" style={{ letterSpacing: -0.2 }}>{item.symbol}</Text>
              <Box style={[styles.typeBadge, { backgroundColor: BADGE_COLORS[item.type] ?? BADGE_COLORS.crypto }]}> 
                {ICON_MAP[item.type] ?? ICON_MAP.crypto}
              </Box>
            </Box>
            <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>{item.name}</Text>
          </Box>

          {isSelected && (
            <Box center style={styles.checkBadge}>
              <Check color={colors.sentiment.bull_green} size={16} />
            </Box>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  const FILTER_TABS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'metal', label: 'Metals' },
    { key: 'fiat', label: 'Forex' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <Box flex={1} style={styles.overlay}>
        <Pressable style={{ flex: 0.15 }} onPress={handleClose} />

        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          style={[styles.sheetBody, { paddingBottom: insets.bottom + spacing.lg }]}
        >
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill as any} />
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.5 }}
            style={StyleSheet.absoluteFill as any}
          />
          <View style={styles.sheetStroke} pointerEvents="none" />

          <Box center style={{ paddingVertical: spacing.sm }}>
            <Box style={styles.handle} />
          </Box>

          <Box row justify="space-between" align="center" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <Text variant="h2" weight="700" style={{ letterSpacing: -0.5 }}>Select Asset</Text>
            <Pressable onPress={handleClose} hitSlop={15} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}> 
              <Box center style={styles.closeBtn}>
                <X color={colors.text.secondary} size={18} />
              </Box>
            </Pressable>
          </Box>

          <Box style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <Box row align="center" style={styles.searchContainer}>
              <Search color={colors.text.muted} size={18} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or symbol..."
                placeholderTextColor={colors.text.muted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={10}>
                  <X color={colors.text.muted} size={16} />
                </Pressable>
              )}
            </Box>
          </Box>

          <Box row style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.xs }}>
            {FILTER_TABS.map(tab => (
              <Pressable key={tab.key} onPress={() => setFilter(tab.key)} style={{ flex: 1 }}>
                <Box
                  center
                  padding={spacing.sm}
                  radius={radius.pill}
                  style={[
                    styles.filterTab,
                    filter === tab.key && styles.filterTabActive,
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    color={filter === tab.key ? colors.text.primary : colors.text.muted}
                  >
                    {tab.label}
                  </Text>
                </Box>
              </Pressable>
            ))}
          </Box>

          {isLoading ? (
            <Box center padding={spacing.xxl}>
              <ActivityIndicator color={colors.text.secondary} />
            </Box>
          ) : error ? (
            <Box center padding={spacing.xxl}>
              <Text variant="body" color={colors.sentiment.bear_red} align="center">{error}</Text>
            </Box>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Box center padding={spacing.xxl}>
                  <Text variant="body" color={colors.text.muted} align="center">
                    No assets found matching "{search}"
                  </Text>
                </Box>
              }
            />
          )}
        </Animated.View>
      </Box>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetBody: {
    flex: 1,
    backgroundColor: 'rgba(17, 19, 26, 0.72)',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  sheetStroke: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'System',
    height: '100%',
  },
  filterTab: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.sm,
  },
  assetRowSelected: {
    backgroundColor: 'rgba(59,217,132,0.05)',
    borderBottomColor: 'rgba(59,217,132,0.08)',
  },
  assetBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  typeBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  checkBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59,217,132,0.12)',
  },
});
