import React, { useEffect } from 'react';
import { ScrollView, Pressable, View, Platform, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInUp, FadeInDown, ZoomIn, SlideInRight } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { colors, spacing, radius } from '../../theme';
import {
  Sparkles,
  ArrowLeft,
  RefreshCw,
  PieChart,
  TrendingUp,
  Star,
  ShieldAlert,
  Info,
  AlertTriangle,
} from 'lucide-react-native';
import { useInsightStore, InsightCard } from '../../store/useInsightStore';
import { formatDateTimeByLocale } from '../../utils/localeFormat';
import { useTranslation } from 'react-i18next';

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  portfolio: {
    icon: PieChart,
    color: '#7B8CDE',
    label: 'Portfolio',
  },
  market: {
    icon: TrendingUp,
    color: colors.sentiment.bull_green,
    label: 'Market',
  },
  watchlist: {
    icon: Star,
    color: colors.accent.premium_gold,
    label: 'Watchlist',
  },
};

const SEVERITY_COLORS: Record<string, string> = {
  positive: colors.sentiment.bull_green,
  negative: colors.sentiment.bear_red,
  warning: '#FFAA33',
  neutral: colors.text.secondary,
};

// ── Single Insight Card ──
const InsightCardItem = ({ card, index, navigation, t }: { card: InsightCard; index: number; navigation: any; t: (key: string, opts?: any) => string }) => {
  const config = CATEGORY_CONFIG[card.category] || CATEGORY_CONFIG.market;
  const IconComponent = config.icon;
  const severityColor = SEVERITY_COLORS[card.severity] || SEVERITY_COLORS.neutral;

  return (
    <Animated.View entering={SlideInRight.delay(150 + index * 120).springify().damping(18).stiffness(100)}>
      <PremiumCard
        delay={0}
        glowColor={`${config.color}15`}
        style={[styles.insightCard, { shadowColor: config.color }]}
      >
        {/* Severity accent bar */}
        <View style={[styles.severityBar, { backgroundColor: severityColor }]} />

        {/* Category badge */}
        <Box row align="center" style={{ marginBottom: spacing.md }}>
          <Box
            center
            style={[styles.categoryBadge, { backgroundColor: `${config.color}15`, borderColor: `${config.color}25` }]}
          >
            <IconComponent color={config.color} size={16} />
          </Box>
          <Text variant="caption" weight="700" color={config.color} style={{ letterSpacing: 1.2, marginLeft: spacing.sm }}>
            {config.label.toUpperCase()}
          </Text>
        </Box>

        {/* Title */}
        <Text variant="h3" weight="600" style={{ marginBottom: spacing.sm, letterSpacing: -0.3 }}>
          {card.title}
        </Text>

        {/* Content */}
        <Text variant="body" color={colors.text.secondary} style={{ lineHeight: 22 }}>
          {card.content}
        </Text>
        <Box row style={{ marginTop: spacing.xs }}>
          <Text variant="caption" color={colors.text.muted}>
            {t('insightsScreen.sourceLine', {
              source: card.source_quality ?? 'medium',
              time: card.last_updated_at ? formatDateTimeByLocale(new Date(card.last_updated_at)).time : 'n/a',
            })}
          </Text>
        </Box>
        {Array.isArray(card.evidence) && card.evidence.length > 0 ? (
          <Box row style={{ marginTop: spacing.xs, flexWrap: 'wrap' }}>
            {card.evidence.map((e) => (
              <Box key={e} style={styles.actionChip}>
                <Text variant="caption" color={colors.text.secondary}>
                  {e}
                </Text>
              </Box>
            ))}
          </Box>
        ) : null}

        <Box row style={{ marginTop: spacing.md }}>
          <Pressable
            onPress={() =>
              navigation.navigate(
                card.category === 'portfolio' ? 'Portfolio' : card.category === 'watchlist' ? 'Watchlist' : 'Markets'
              )
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Box style={styles.actionChip}>
              <Text variant="caption" weight="700" color={colors.accent.primary_blue}>
                {card.category === 'portfolio'
                  ? t('insightsScreen.applyPortfolio')
                  : card.category === 'watchlist'
                    ? t('insightsScreen.applyWatchlist')
                    : t('insightsScreen.applyMarkets')}
              </Text>
            </Box>
          </Pressable>
        </Box>
      </PremiumCard>
    </Animated.View>
  );
};

// ── Main Screen ──
export const InsightsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { latestInsight, isLoading, isGenerating, error, fetchLatestInsight, generateNewInsight, clearError } = useInsightStore();

  useEffect(() => {
    fetchLatestInsight();
  }, []);

  const handleGenerate = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await generateNewInsight();
  };

  const renderSkeletons = () => (
    <Box padding={spacing.lg}>
      {[1, 2, 3].map(i => (
        <Box key={i} style={{ marginBottom: spacing.lg }}>
          <Skeleton height={24} width={100} style={{ marginBottom: spacing.sm }} />
          <Skeleton height={18} width="80%" style={{ marginBottom: spacing.xs }} />
          <Skeleton height={60} width="100%" style={{ borderRadius: radius.lg }} />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box flex={1} bg={colors.background.base}>
      {/* ── Blur Header ── */}
      <View style={styles.headerWrap}>
        <BlurView intensity={60} tint="dark" style={[styles.blurHeader, { paddingTop: insets.top + 8 }]}>
          <Box row justify="space-between" align="center" style={{ paddingHorizontal: spacing.lg }}>
            <Pressable hitSlop={20} onPress={() => navigation?.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Box center style={styles.iconBtn}>
                <ArrowLeft color={colors.text.primary} size={20} />
              </Box>
            </Pressable>

            <Box row align="center">
              <Sparkles color={colors.accent.premium_gold} size={18} style={{ marginRight: spacing.xs }} />
              <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>{t('insightsScreen.title')}</Text>
            </Box>

            {/* Generate Button */}
            <Pressable
              hitSlop={15}
              onPress={handleGenerate}
              disabled={isGenerating}
              style={({ pressed }) => [{ opacity: pressed || isGenerating ? 0.5 : 1 }]}
            >
              <Box center style={styles.iconBtn}>
                <RefreshCw color={colors.accent.premium_gold} size={18} />
              </Box>
            </Pressable>
          </Box>
        </BlurView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchLatestInsight} tintColor={colors.accent.premium_gold} />
        }
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: insets.bottom + 120 }}
      >
        {/* ── Premium Hero Section ── */}
        <Animated.View entering={FadeInUp.duration(500).springify()}>
          <Box style={styles.heroSection}>
            <LinearGradient
              colors={['rgba(200, 169, 126, 0.08)', 'rgba(200, 169, 126, 0.02)', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroGradient}
            >
              <Box center>
                <Animated.View entering={ZoomIn.delay(200).springify()}>
                  <Box center style={styles.heroIcon}>
                    <Sparkles color={colors.accent.premium_gold} size={28} />
                  </Box>
                </Animated.View>
                <Text variant="h1" weight="700" style={{ fontSize: 28, letterSpacing: -1, marginTop: spacing.md, marginBottom: spacing.xs }}>
                  {t('insightsScreen.heroTitle')}
                </Text>
                <Text variant="body" color={colors.text.secondary} align="center" style={{ paddingHorizontal: spacing.xl, lineHeight: 22 }}>
                  {t('insightsScreen.heroDesc')}
                </Text>
              </Box>
            </LinearGradient>
          </Box>
        </Animated.View>

        {/* ── Error Banner ── */}
        {error && (
          <Pressable onPress={clearError}>
            <Box row align="center" style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, backgroundColor: 'rgba(255,92,92,0.08)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,92,92,0.15)' }}>
              <AlertTriangle color={colors.sentiment.bear_red} size={18} style={{ marginRight: spacing.sm }} />
              <Text variant="body" color={colors.sentiment.bear_red} style={{ flex: 1 }}>
                {t('insightsScreen.errorHint', { error })}
              </Text>
              <Text variant="caption" color={colors.text.muted}>{t('common.tapToDismiss')}</Text>
            </Box>
          </Pressable>
        )}

        {/* ── Insight Cards ── */}
        {isLoading && !latestInsight ? renderSkeletons() : (
          <Box padding={spacing.lg} style={{ paddingTop: 0 }}>
            {isGenerating ? (
              <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.sm }}>
                {t('insightsScreen.generating')}
              </Text>
            ) : null}
            {latestInsight?.cards.map((card, index) => (
              <InsightCardItem key={card.id} card={card} index={index} navigation={navigation} t={t} />
            ))}

            {(!latestInsight || latestInsight.cards.length === 0) && !error && (
              <Animated.View entering={FadeInDown.duration(500).springify()}>
                <GuidedStateCard
                  title={t('insightsScreen.emptyTitle')}
                  description={t('insightsScreen.emptyDesc')}
                  ctaLabel={t('insightsScreen.generateCta', 'Yeni içgörü üret')}
                  onPress={handleGenerate}
                  icon={<Sparkles color={colors.accent.premium_gold} size={32} />}
                />
              </Animated.View>
            )}
          </Box>
        )}

        {/* ── Timestamp ── */}
        {latestInsight && (
          <Animated.View entering={FadeInUp.delay(600).springify()}>
            <Box center style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
              <Text variant="caption" color={colors.text.muted}>
                {t('insightsScreen.generatedAt', {
                  date: formatDateTimeByLocale(new Date(latestInsight.created_at)).date,
                  time: formatDateTimeByLocale(new Date(latestInsight.created_at)).time,
                })}
              </Text>
            </Box>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Sticky Disclaimer Footer ── */}
      <Animated.View entering={FadeInDown.delay(800).springify().damping(15)} style={[styles.disclaimerWrap, { paddingBottom: insets.bottom + spacing.sm }]}>
        <BlurView intensity={80} tint="dark" style={styles.disclaimerBlur}>
          <Box row align="center" style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
            <ShieldAlert color={colors.text.muted} size={14} style={{ marginRight: spacing.sm }} />
            <Text variant="caption" color={colors.text.muted} style={{ flex: 1, lineHeight: 16 }}>
              {latestInsight?.disclaimer || t('insightsScreen.defaultDisclaimer')}
            </Text>
          </Box>
        </BlurView>
      </Animated.View>
    </Box>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  blurHeader: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroSection: {
    marginBottom: spacing.lg,
  },
  heroGradient: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(200, 169, 126, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200, 169, 126, 0.2)',
  },
  insightCard: {
    marginBottom: spacing.md,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    position: 'relative',
    overflow: 'hidden',
  },
  severityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  categoryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionChip: {
    borderWidth: 1,
    borderColor: 'rgba(129, 166, 213, 0.35)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(143, 199, 255, 0.08)',
  },
  disclaimerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  disclaimerBlur: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});
