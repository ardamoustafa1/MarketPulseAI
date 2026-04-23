import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Sparkles, Users } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchCommunityLists } from '../../api/social';
import type { CommunityList } from '../../types/social';
import { colors, radius, spacing } from '../../theme';

const CATEGORY_LABEL: Record<string, string> = {
  curated: 'Küratörlü',
  system: 'Sistem',
  user: 'Topluluk',
};

export const CommunityListsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState<CommunityList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommunityLists();
      setLists(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Listeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Topluluk Listeleri"
        subtitle="Küratörlü varlık sepetleri"
        onBack={() => navigation?.goBack()}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        {loading && lists.length === 0 && (
          <ActivityIndicator color={colors.accent.premium_gold} />
        )}
        {error && (
          <Text color={colors.sentiment.bear_red} variant="caption">
            {error}
          </Text>
        )}
        {lists.map((list, i) => (
          <Animated.View
            key={list.id}
            entering={FadeInUp.delay(i * 60).springify().damping(18)}
          >
            <Pressable
              onPress={() =>
                navigation?.navigate('CommunityListDetail', { slug: list.slug })
              }
              style={({ pressed }) => ({
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${list.hero_color ?? '#7C6CFF'}22`,
                    borderWidth: 1,
                    borderColor: `${list.hero_color ?? '#7C6CFF'}55`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{list.emoji ?? '✨'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text variant="body" weight="700" numberOfLines={1}>
                      {list.title}
                    </Text>
                    {list.is_featured && (
                      <Sparkles color={colors.accent.premium_gold} size={14} />
                    )}
                  </View>
                  {list.subtitle && (
                    <Text
                      variant="caption"
                      color={colors.text.secondary}
                      numberOfLines={1}
                      style={{ marginTop: 2 }}
                    >
                      {list.subtitle}
                    </Text>
                  )}
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: spacing.sm,
                }}
              >
                <Text variant="caption" color={colors.text.muted}>
                  {list.item_count} varlık · {CATEGORY_LABEL[list.category] ?? list.category}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Users color={colors.text.muted} size={12} />
                  <Text variant="caption" color={colors.text.muted} mono>
                    {list.follower_count.toLocaleString('tr-TR')}
                  </Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </Box>
  );
};
