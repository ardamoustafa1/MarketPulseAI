import React, { useEffect } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { colors, radius, spacing } from '../../theme';
import { useRecapStore } from '../../store/useRecapStore';

interface NavProp {
  goBack: () => void;
  navigate: (name: string) => void;
}

export const WeeklyRecapScreen = ({ navigation }: { navigation: NavProp }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { weekly, fetchWeekly, isLoading } = useRecapStore();

  useEffect(() => {
    void fetchWeekly();
  }, [fetchWeekly]);

  const onShare = async () => {
    if (!weekly) return;
    await Share.share({
      title: weekly.headline,
      message: `${weekly.headline}\n${weekly.narrative}\n\n— MarketPulse AI`,
    });
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
          {t('weeklyRecapScreen.title')}
        </Text>
        <Pressable
          onPress={onShare}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Share2 color={colors.text.primary} size={20} />
        </Pressable>
      </Box>

      {isLoading && !weekly ? (
        <Box flex={1} center>
          <ActivityIndicator color={colors.accent.premium_gold} />
        </Box>
      ) : !weekly ? (
        <Box padding={spacing.lg}>
          <GuidedStateCard
            title={t('weeklyRecapScreen.emptyTitle')}
            description={t('weeklyRecapScreen.emptyDesc')}
            ctaLabel={t('weeklyRecapScreen.retry')}
            onPress={() => void fetchWeekly()}
          />
        </Box>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 48 }}
        >
          <Box style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(200,169,126,0.4)', 'rgba(20,21,25,0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Box style={{ zIndex: 1 }}>
              <Text variant="caption" color="rgba(255,255,255,0.7)" weight="700" style={{ letterSpacing: 1.4 }}>
                {t('weeklyRecapScreen.period', {
                  start: new Date(weekly.period_start).toLocaleDateString(),
                  end: new Date(weekly.period_end).toLocaleDateString(),
                })}
              </Text>
              <Text variant="h1" weight="700" style={{ marginTop: 10, letterSpacing: -0.5 }}>
                {weekly.headline}
              </Text>
              <Text variant="body" color="rgba(255,255,255,0.8)" style={{ marginTop: 12, lineHeight: 24 }}>
                {weekly.narrative}
              </Text>
            </Box>
          </Box>

          <Box row style={{ flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            {weekly.highlights.map((h, idx) => (
              <Box key={idx} style={styles.highlight}>
                <Text variant="caption" color={colors.text.muted} weight="700">
                  {h.label.toUpperCase()}
                </Text>
                <Text variant="h3" weight="700" style={{ marginTop: 6 }} mono>
                  {h.value}
                </Text>
                {h.delta ? (
                  <Text variant="caption" color={colors.sentiment.bull_green} mono>
                    {h.delta}
                  </Text>
                ) : null}
              </Box>
            ))}
          </Box>

          {weekly.top_assets.length > 0 ? (
            <>
              <Box row align="center" style={{ marginBottom: spacing.sm }}>
                <TrendingUp color={colors.accent.premium_gold} size={16} style={{ marginRight: 8 }} />
                <Text variant="h3" weight="700">
                  {t('weeklyRecapScreen.topAssets')}
                </Text>
              </Box>
              {weekly.top_assets.map((a) => (
                <Box key={a.symbol} style={styles.lineCard}>
                  <Box row justify="space-between">
                    <Text variant="body" weight="700">
                      {a.symbol}
                    </Text>
                    <Text variant="body" weight="700" mono>
                      {a.pct_change}
                    </Text>
                  </Box>
                  <Box row justify="space-between" style={{ marginTop: 4 }}>
                    <Text variant="caption" color={colors.text.muted} mono>
                      {a.quantity}
                    </Text>
                    <Text variant="caption" color={colors.text.muted} mono>
                      P&L {a.realized_pnl}
                    </Text>
                  </Box>
                </Box>
              ))}
            </>
          ) : null}
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
    minHeight: 200,
  },
  highlight: {
    width: '48%',
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.lg,
  },
  lineCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
});
