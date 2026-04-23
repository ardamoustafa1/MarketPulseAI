import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { BookOpen, Clock3 } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { AcademyArticleSummary } from '../../store/useAcademyStore';
import { colors, radius, spacing } from '../../theme';

interface AcademyRailProps {
  articles: AcademyArticleSummary[];
  onPressArticle: (slug: string) => void;
  onPressAll: () => void;
}

export const AcademyRail: React.FC<AcademyRailProps> = ({
  articles,
  onPressArticle,
  onPressAll,
}) => {
  const { t } = useTranslation();
  if (articles.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(260).springify().damping(20)}
      style={{ marginBottom: spacing.md }}
    >
      <Box row justify="space-between" align="center" style={{ marginBottom: spacing.sm }}>
        <Box row align="center">
          <BookOpen color={colors.accent.premium_gold} size={18} style={{ marginRight: 8 }} />
          <Text variant="h3" weight="700">
            {t('academyRail.title')}
          </Text>
        </Box>
        <Pressable onPress={onPressAll} hitSlop={12}>
          <Text variant="caption" color={colors.accent.primary_blue}>
            {t('academyRail.browseAll')}
          </Text>
        </Pressable>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.lg }}
      >
        {articles.slice(0, 6).map((article) => (
          <Pressable
            key={`${article.locale}:${article.slug}`}
            onPress={() => onPressArticle(article.slug)}
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[
                article.hero_color + 'CC',
                article.hero_color + '55',
                'rgba(15,16,20,0.95)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Box style={{ zIndex: 1, flex: 1 }}>
              <Box row align="center">
                <Text variant="caption" color="rgba(255,255,255,0.85)" weight="700">
                  {article.category.toUpperCase()}
                </Text>
              </Box>
              <Text
                variant="body"
                weight="700"
                style={{ marginTop: 8, lineHeight: 20 }}
                numberOfLines={3}
              >
                {article.title}
              </Text>
              <Box row align="center" style={{ marginTop: 'auto' }}>
                <Clock3 color="rgba(255,255,255,0.75)" size={12} style={{ marginRight: 4 }} />
                <Text variant="caption" color="rgba(255,255,255,0.75)">
                  {article.read_time_minutes} {t('academyRail.minutesShort')}
                </Text>
              </Box>
            </Box>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 220,
    height: 140,
    borderRadius: radius.lg,
    padding: 16,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
