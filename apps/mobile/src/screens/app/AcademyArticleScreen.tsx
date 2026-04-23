import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';
import { AcademyArticle, useAcademyStore } from '../../store/useAcademyStore';

interface RouteProp {
  params?: { slug?: string; locale?: string };
}

interface NavProp {
  goBack: () => void;
}

export const AcademyArticleScreen = ({
  navigation,
  route,
}: {
  navigation: NavProp;
  route: RouteProp;
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const slug = route?.params?.slug || 'dca-101';
  const locale = route?.params?.locale || 'tr';
  const fetchArticle = useAcademyStore((s) => s.fetchArticle);
  const [article, setArticle] = useState<AcademyArticle | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchArticle(slug, locale);
      if (!cancelled) setArticle(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, locale, fetchArticle]);

  const onShare = async () => {
    if (!article) return;
    await Share.share({
      title: article.title,
      message: `${article.title} — MarketPulse Academy\n${article.subtitle}`,
    });
  };

  if (!article) {
    return (
      <Box flex={1} bg={colors.background.base} center style={{ paddingTop: insets.top }}>
        <ActivityIndicator color={colors.accent.premium_gold} />
      </Box>
    );
  }

  return (
    <Box flex={1} bg={colors.background.base}>
      <LinearGradient
        colors={[article.hero_color + '55', 'rgba(15,16,20,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 320,
        }}
      />
      <Box
        row
        align="center"
        justify="space-between"
        style={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Pressable
          onPress={onShare}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Share2 color={colors.text.primary} size={20} />
        </Pressable>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 48 }}
      >
        <Text variant="caption" color={article.hero_color} weight="700" style={{ letterSpacing: 1.4, marginBottom: 8 }}>
          {article.category.toUpperCase()} · {article.read_time_minutes} {t('academyScreen.minutes')}
        </Text>
        <Text variant="h1" weight="700" style={{ marginBottom: spacing.sm, letterSpacing: -0.5 }}>
          {article.title}
        </Text>
        <Text variant="body" color={colors.text.secondary} style={{ lineHeight: 24, marginBottom: spacing.xl }}>
          {article.subtitle}
        </Text>

        {article.cards.map((card, idx) => (
          <Box key={idx} style={styles.card}>
            <Text variant="caption" color={colors.text.muted} weight="700" style={{ letterSpacing: 1.2, marginBottom: 6 }}>
              {String(idx + 1).padStart(2, '0')}
            </Text>
            <Text variant="h3" weight="700" style={{ marginBottom: 8 }}>
              {card.heading}
            </Text>
            <Text variant="body" color={colors.text.secondary} style={{ lineHeight: 24 }}>
              {card.body}
            </Text>
          </Box>
        ))}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
});
