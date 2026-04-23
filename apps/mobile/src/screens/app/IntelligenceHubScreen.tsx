import React, { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Brain, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';
import { useIntelligenceStore } from '../../store/useIntelligenceStore';
import { IntelligenceHeroCard } from '../../components/intelligence/IntelligenceHeroCard';
import { TodaySignalStrip } from '../../components/intelligence/TodaySignalStrip';
import { RatioRadarList } from '../../components/intelligence/RatioRadarList';
import { CorrelationHeatmap } from '../../components/intelligence/CorrelationHeatmap';
import { NewsImpactList } from '../../components/intelligence/NewsImpactList';
import { MacroCalendarList } from '../../components/intelligence/MacroCalendarList';
import { OnchainPulseList } from '../../components/intelligence/OnchainPulseList';
import { BazaarSpreadList } from '../../components/intelligence/BazaarSpreadList';
import { CarryScoreList } from '../../components/intelligence/CarryScoreList';

export const IntelligenceHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { hub, isLoading, isRefreshing, error, fetchHub } = useIntelligenceStore();

  const locale = (i18n.language || 'tr').startsWith('en') ? 'en' : 'tr';

  const load = useCallback(
    (force = false) => {
      void fetchHub({ force, locale });
    },
    [fetchHub, locale]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unavailable on some devices; ignore silently
    }
    load(true);
  };

  return (
    <Box style={[styles.container, { paddingTop: insets.top }]}>
      <Box row justify="space-between" align="center" style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <ArrowLeft color={colors.text.primary} size={20} />
        </Pressable>
        <Box row align="center">
          <Brain color={colors.accent.premium_gold} size={20} style={{ marginRight: 6 }} />
          <Text variant="h3" weight="700">{t('intelligence.screenTitle')}</Text>
        </Box>
        <Pressable onPress={handleRefresh} hitSlop={10} style={styles.iconBtn}>
          <RefreshCw color={colors.text.primary} size={18} />
        </Pressable>
      </Box>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent.premium_gold} />}
      >
        {isLoading && !hub ? (
          <Text variant="body" color={colors.text.secondary} style={{ marginTop: spacing.xl, textAlign: 'center' }}>
            {t('intelligence.loading')}
          </Text>
        ) : null}

        {error && !hub ? (
          <Box style={styles.errorBox}>
            <Text variant="body" weight="700" color={colors.sentiment.bear_red}>
              {t('intelligence.errorTitle')}
            </Text>
            <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 4 }}>
              {error}
            </Text>
          </Box>
        ) : null}

        {hub ? (
          <>
            <IntelligenceHeroCard portfolio={hub.today_signals.portfolio} regime={hub.regime} />

            <TodaySignalStrip assets={hub.today_signals.assets} />

            <Box style={styles.regimeDetail}>
              <Text variant="body" weight="700" style={{ marginBottom: 6 }}>
                {t('intelligence.regimeTitle')}
              </Text>
              <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 18 }}>
                {hub.regime.narrative}
              </Text>
              {hub.regime.components.length > 0 ? (
                <Box row style={{ marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
                  {hub.regime.components.map((c) => (
                    <Box key={c.label} style={styles.chip}>
                      <Text variant="caption" color={colors.text.secondary} style={{ fontSize: 11 }}>{c.label}</Text>
                      <Text variant="caption" weight="700" mono>
                        {c.contribution >= 0 ? '+' : ''}{c.contribution.toFixed(2)}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Box>

            <RatioRadarList entries={hub.ratios.entries} />
            <CorrelationHeatmap data={hub.correlations} />
            <NewsImpactList items={hub.news_impact.items} />
            <MacroCalendarList events={hub.macro_calendar.events} />
            <OnchainPulseList assets={hub.onchain.assets} />
            <BazaarSpreadList data={hub.bazaar} />
            <CarryScoreList pairs={hub.fx_carry.pairs} />

            {hub.disclaimers.length ? (
              <Box style={styles.disclaimer}>
                {hub.disclaimers.map((d, idx) => (
                  <Text key={idx} variant="caption" color={colors.text.muted} style={{ lineHeight: 18 }}>• {d}</Text>
                ))}
              </Box>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  regimeDetail: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(24,26,32,0.5)',
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,92,92,0.35)',
    backgroundColor: 'rgba(255,92,92,0.08)',
    marginTop: spacing.md,
  },
  disclaimer: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginTop: spacing.md,
    gap: 4,
  },
});
