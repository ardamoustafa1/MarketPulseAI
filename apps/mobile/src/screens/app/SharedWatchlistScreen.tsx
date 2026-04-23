import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { colors, radius, spacing } from '../../theme';
import { useShareStore } from '../../store/useShareStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';

interface RouteProp {
  params?: { token?: string };
}

interface NavProp {
  goBack: () => void;
  navigate: (name: string) => void;
}

export const SharedWatchlistScreen = ({
  navigation,
  route,
}: {
  navigation: NavProp;
  route: RouteProp;
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const token = route?.params?.token;
  const { viewedPayload, viewSharedWatchlist, error } = useShareStore();
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);

  useEffect(() => {
    if (token) void viewSharedWatchlist(token);
  }, [token, viewSharedWatchlist]);

  const importAll = async () => {
    if (!viewedPayload) return;
    for (const a of viewedPayload.assets) {
      await toggleFavorite({ symbol: a.symbol, name: a.name });
    }
  };

  return (
    <Box flex={1} bg={colors.background.base} style={{ paddingTop: insets.top }}>
      <Box row align="center" justify="space-between" style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h2" weight="700">
          {t('sharedWatchlist.title')}
        </Text>
        <Box style={{ width: 44 }} />
      </Box>

      {!viewedPayload && !error ? (
        <Box flex={1} center>
          <ActivityIndicator color={colors.accent.premium_gold} />
        </Box>
      ) : !viewedPayload ? (
        <Box padding={spacing.lg}>
          <GuidedStateCard
            title={t('sharedWatchlist.expiredTitle')}
            description={t('sharedWatchlist.expiredDesc')}
            ctaLabel={t('sharedWatchlist.back')}
            onPress={() => navigation.goBack()}
          />
        </Box>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 48 }}>
          <Box style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(74,92,130,0.4)', 'rgba(20,21,25,0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Box style={{ zIndex: 1 }}>
              <Box row align="center" style={{ marginBottom: spacing.sm }}>
                <Users color={colors.accent.primary_blue} size={16} style={{ marginRight: 8 }} />
                <Text variant="caption" color={colors.text.muted} weight="700" style={{ letterSpacing: 1.4 }}>
                  {t('sharedWatchlist.sharedBy').toUpperCase()}
                </Text>
              </Box>
              <Text variant="h2" weight="700" style={{ marginBottom: 6 }}>
                {viewedPayload.owner_display_name}
              </Text>
              <Text variant="body" color={colors.text.secondary}>
                {t('sharedWatchlist.count', { count: viewedPayload.asset_count })}
              </Text>
            </Box>
          </Box>

          {viewedPayload.assets.map((a) => (
            <Box key={a.symbol} style={styles.line}>
              <Box row justify="space-between" align="center">
                <Box>
                  <Text variant="body" weight="700">
                    {a.symbol}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    {a.name}
                  </Text>
                </Box>
                <Text variant="caption" color={colors.text.muted}>
                  {a.type.toUpperCase()}
                </Text>
              </Box>
            </Box>
          ))}

          <Pressable
            onPress={() => void importAll()}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text color={colors.background.base} weight="700">
              {t('sharedWatchlist.importAll')}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  line: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  cta: {
    marginTop: spacing.xl,
    backgroundColor: colors.text.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
});
