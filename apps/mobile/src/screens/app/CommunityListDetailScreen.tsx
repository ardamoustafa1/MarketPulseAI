import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Star, Users } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import {
  fetchCommunityListBySlug,
  followStrategy,
} from '../../api/social';
import type { CommunityList } from '../../types/social';
import { colors, radius, spacing } from '../../theme';

export const CommunityListDetailScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const slug: string = route?.params?.slug ?? '';
  const [list, setList] = useState<CommunityList | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followed, setFollowed] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommunityListBySlug(slug);
      setList(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Liste alınamadı');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFollow = async () => {
    if (!list) return;
    setWorking(true);
    try {
      await followStrategy({ list_id: list.id, mode: 'watchlist' });
      setFollowed(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignored intentionally
    } finally {
      setWorking(false);
    }
  };

  const onShare = async () => {
    if (!list) return;
    await Haptics.selectionAsync();
    await Share.share({
      title: list.title,
      message: `${list.title}\n${list.subtitle ?? ''}\n${list.share_url ?? ''}`,
      url: list.share_url ?? undefined,
    });
  };

  if (loading && !list) {
    return (
      <Box flex={1} bg={colors.background.base} center>
        <ActivityIndicator color={colors.accent.premium_gold} />
      </Box>
    );
  }

  if (!list) {
    return (
      <Box flex={1} bg={colors.background.base}>
        <HeaderBar title="Liste" onBack={() => navigation?.goBack()} />
        <Box flex={1} center>
          <Text color={colors.text.secondary}>{error ?? 'Liste bulunamadı'}</Text>
        </Box>
      </Box>
    );
  }

  const accent = list.hero_color ?? '#7C6CFF';

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title={list.title}
        subtitle={list.curator_display_name ?? 'MarketPulse Curation'}
        onBack={() => navigation?.goBack()}
        right={
          <Pressable hitSlop={16} onPress={onShare}>
            <Share2 size={20} color={colors.text.primary} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <LinearGradient
          colors={[`${accent}55`, `${accent}11`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.lg,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: `${accent}33`,
            gap: spacing.sm,
          }}
        >
          <Text style={{ fontSize: 36 }}>{list.emoji ?? '✨'}</Text>
          <Text variant="h2" weight="800">
            {list.title}
          </Text>
          {list.description && (
            <Text variant="body" color={colors.text.secondary}>
              {list.description}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={14} color={colors.text.secondary} />
              <Text variant="caption" color={colors.text.secondary} mono>
                {list.follower_count.toLocaleString('tr-TR')} takipçi
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={14} color={colors.accent.premium_gold} />
              <Text variant="caption" color={colors.text.secondary}>
                {list.item_count} varlık
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
          }}
        >
          <Pressable
            onPress={onFollow}
            disabled={working || followed}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 12,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: followed
                ? colors.sentiment.bull_green
                : colors.accent.premium_gold,
              opacity: pressed || working ? 0.75 : 1,
            })}
          >
            <Text weight="800" color="#141622">
              {followed ? 'Takip ediliyor' : 'Sanal olarak takip et'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onShare}
            style={({ pressed }) => ({
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: radius.pill,
              alignItems: 'center',
              flexDirection: 'row',
              gap: 6,
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: colors.border.soft,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Share2 color={colors.text.primary} size={16} />
            <Text weight="700">Paylaş</Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: colors.background.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border.soft,
            padding: spacing.md,
          }}
        >
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
            Sepet içeriği
          </Text>
          {list.items
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((item) => (
              <Pressable
                key={item.symbol}
                onPress={() =>
                  navigation?.navigate('AssetDetail', { symbol: item.symbol })
                }
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    variant="caption"
                    color={colors.text.muted}
                    mono
                    style={{ width: 24 }}
                  >
                    {item.position.toString().padStart(2, '0')}
                  </Text>
                  <Text variant="body" weight="700">
                    {item.symbol}
                  </Text>
                </View>
                {item.suggested_weight_pct !== null && (
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    mono
                  >
                    %{item.suggested_weight_pct.toFixed(1)}
                  </Text>
                )}
              </Pressable>
            ))}
        </View>
      </ScrollView>
    </Box>
  );
};
