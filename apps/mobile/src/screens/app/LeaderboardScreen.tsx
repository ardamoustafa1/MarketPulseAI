import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Crown, Medal, Trophy } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchLeaderboard } from '../../api/social';
import type {
  LeaderboardLeague,
  LeaderboardSeason,
} from '../../types/social';
import { colors, radius, spacing } from '../../theme';

const LEAGUES: { code: LeaderboardLeague; label: string }[] = [
  { code: 'overall', label: 'Genel' },
  { code: 'crypto', label: 'Kripto' },
  { code: 'metals', label: 'Altın' },
  { code: 'fx', label: 'FX' },
  { code: 'equity', label: 'Hisse' },
  { code: 'commodity', label: 'Emtia' },
];

const rankTrophy = (rank: number) => {
  if (rank === 1) return <Crown size={16} color="#E2A649" />;
  if (rank === 2) return <Medal size={16} color="#B8B9BF" />;
  if (rank === 3) return <Medal size={16} color="#CD7F32" />;
  return null;
};

export const LeaderboardScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [league, setLeague] = useState<LeaderboardLeague>('overall');
  const [season, setSeason] = useState<LeaderboardSeason | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (lg: LeaderboardLeague) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(lg, 20);
      setSeason(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lider tablosu alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(league);
  }, [league, load]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Lider Tablosu"
        subtitle="4 haftalık sanal sezonlar"
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {LEAGUES.map((lg) => {
            const sel = lg.code === league;
            return (
              <Pressable
                key={lg.code}
                onPress={() => setLeague(lg.code)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  backgroundColor: sel
                    ? colors.accent.primary_blue
                    : colors.background.surface,
                  borderWidth: 1,
                  borderColor: sel ? colors.accent.primary_blue : colors.border.soft,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  color={sel ? '#FFF' : colors.text.secondary}
                >
                  {lg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && !season && <ActivityIndicator color={colors.accent.premium_gold} />}
        {error && (
          <Text color={colors.sentiment.bear_red} variant="caption">
            {error}
          </Text>
        )}

        {season && (
          <>
            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <Trophy color={colors.accent.premium_gold} size={28} />
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="800">
                  {season.title}
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  {season.is_active
                    ? `${season.days_remaining} gün kaldı`
                    : 'Kapalı sezon'}
                </Text>
              </View>
              {season.your_rank !== null && (
                <View
                  style={{
                    backgroundColor: colors.background.elevated,
                    borderRadius: radius.pill,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: colors.border.soft,
                  }}
                >
                  <Text variant="caption" weight="700" color={colors.text.primary}>
                    Sıran: {season.your_rank}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                overflow: 'hidden',
              }}
            >
              {season.entries.map((entry, i) => (
                <Animated.View
                  key={`${entry.rank}-${entry.display_name}`}
                  entering={FadeInUp.delay(i * 30)}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: spacing.md,
                      borderBottomWidth: i === season.entries.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border.soft,
                      backgroundColor: entry.is_you
                        ? `${colors.accent.premium_gold}14`
                        : 'transparent',
                      gap: spacing.md,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      {rankTrophy(entry.rank)}
                      <Text
                        variant="body"
                        weight="800"
                        mono
                        color={
                          entry.rank <= 3
                            ? colors.accent.premium_gold
                            : colors.text.secondary
                        }
                      >
                        {entry.rank}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight={entry.is_you ? '800' : '600'}>
                        {entry.display_name}
                        {entry.is_you ? '  (sen)' : ''}
                      </Text>
                      <Text variant="caption" color={colors.text.muted}>
                        {entry.win_count} kazanan işlem
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        variant="body"
                        weight="700"
                        mono
                        color={
                          entry.roi_pct >= 0
                            ? colors.sentiment.bull_green
                            : colors.sentiment.bear_red
                        }
                      >
                        {entry.roi_pct >= 0 ? '+' : ''}
                        {entry.roi_pct.toFixed(2)}%
                      </Text>
                      <Text variant="caption" color={colors.text.muted} mono>
                        skor {Math.round(entry.score)}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Box>
  );
};
