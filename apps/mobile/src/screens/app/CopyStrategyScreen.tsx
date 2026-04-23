import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Share2, Unlink } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchCopyFollows, unfollowStrategy } from '../../api/social';
import type { CopyFollow } from '../../types/social';
import { colors, radius, spacing } from '../../theme';

const MODE_LABEL: Record<string, string> = {
  watchlist: 'İzleme listesi',
  allocation: 'Ağırlık dağılımı',
  paper_trades: 'Sanal işlemler',
};

export const CopyStrategyScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CopyFollow[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCopyFollows();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onUnfollow = async (id: string) => {
    setWorking(id);
    try {
      await unfollowStrategy(id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setWorking(null);
    }
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Copy-Strategy"
        subtitle="Sanal takip — tamamen eğitim amaçlı"
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
        <View
          style={{
            backgroundColor: colors.background.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border.soft,
            padding: spacing.md,
          }}
        >
          <Text variant="caption" color={colors.text.muted}>
            Seçtiğin topluluk listesi veya sanal portföyü burada sanal olarak
            takip edersin. Hiçbir gerçek işlem yapılmaz — tamamen eğitim amaçlıdır.
          </Text>
        </View>

        {loading && items.length === 0 && (
          <ActivityIndicator color={colors.accent.premium_gold} />
        )}

        {!loading && items.length === 0 && (
          <View
            style={{
              alignItems: 'center',
              padding: spacing.xl,
              gap: spacing.md,
            }}
          >
            <Share2 color={colors.accent.premium_gold} size={32} />
            <Text variant="h3" weight="700" align="center">
              Henüz takip ettiğin strateji yok
            </Text>
            <Text variant="caption" color={colors.text.secondary} align="center">
              Topluluk listelerine git ve bir sepeti &quot;sanal olarak takip et&quot;
              diyerek başla.
            </Text>
            <Pressable
              onPress={() => navigation?.navigate('CommunityLists')}
              style={{
                backgroundColor: colors.accent.premium_gold,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderRadius: radius.pill,
              }}
            >
              <Text color="#141622" weight="800">
                Topluluk Listelerini keşfet
              </Text>
            </Pressable>
          </View>
        )}

        {items.map((follow, i) => (
          <Animated.View
            key={follow.id}
            entering={FadeInUp.delay(i * 60).springify().damping(20)}
          >
            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
              }}
            >
              <Text variant="body" weight="700">
                {follow.list_title ?? follow.leader_display_name ?? 'Sanal strateji'}
              </Text>
              <Text
                variant="caption"
                color={colors.text.secondary}
                style={{ marginTop: 2 }}
              >
                {MODE_LABEL[follow.mode] ?? follow.mode}
                {follow.last_synced_at
                  ? ` · son eşleşme ${new Date(follow.last_synced_at).toLocaleDateString(
                      'tr-TR',
                    )}`
                  : ''}
              </Text>
              <Pressable
                onPress={() => onUnfollow(follow.id)}
                disabled={working === follow.id}
                style={({ pressed }) => ({
                  marginTop: spacing.md,
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: radius.pill,
                  backgroundColor: colors.background.elevated,
                  borderWidth: 1,
                  borderColor: colors.border.soft,
                  opacity: pressed || working === follow.id ? 0.7 : 1,
                })}
              >
                <Unlink color={colors.sentiment.bear_red} size={14} />
                <Text variant="caption" weight="700" color={colors.sentiment.bear_red}>
                  Takibi bırak
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </Box>
  );
};
