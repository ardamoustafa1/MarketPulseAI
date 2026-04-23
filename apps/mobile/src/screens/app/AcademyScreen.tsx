import React, { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, Clock3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { colors, radius, spacing } from '../../theme';
import { useAcademyStore } from '../../store/useAcademyStore';
import i18n from '../../i18n';

interface NavProp {
  navigate: (name: string, params?: object) => void;
  goBack: () => void;
}

export const AcademyScreen = ({ navigation }: { navigation: NavProp }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { list, fetchList, isLoading } = useAcademyStore();
  const locale = (i18n.language || 'tr').split('-')[0];

  useEffect(() => {
    void fetchList(locale);
  }, [fetchList, locale]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof list> = {};
    list.forEach((a) => {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    });
    return Object.entries(map);
  }, [list]);

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
          {t('academyScreen.title')}
        </Text>
        <Box style={{ width: 44 }} />
      </Box>

      {list.length === 0 && !isLoading ? (
        <Box padding={spacing.lg}>
          <GuidedStateCard
            title={t('academyScreen.emptyTitle')}
            description={t('academyScreen.emptyDesc')}
            ctaLabel={t('academyScreen.retry')}
            onPress={() => void fetchList(locale)}
            icon={<BookOpen color={colors.text.muted} size={32} />}
          />
        </Box>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([category]) => category}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 48 }}
          renderItem={({ item }) => {
            const [category, items] = item;
            return (
              <Box style={{ marginBottom: spacing.xl }}>
                <Text variant="caption" color={colors.text.muted} weight="700" style={{ marginBottom: spacing.sm, letterSpacing: 1.4 }}>
                  {category.toUpperCase()}
                </Text>
                {items.map((article) => (
                  <Pressable
                    key={article.slug}
                    onPress={() =>
                      navigation.navigate('AcademyArticle', { slug: article.slug, locale: article.locale })
                    }
                    style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
                  >
                    <LinearGradient
                      colors={[article.hero_color + 'AA', 'rgba(17,19,23,0.95)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Box style={{ zIndex: 1 }}>
                      <Text variant="h3" weight="700" style={{ marginBottom: 6 }}>
                        {article.title}
                      </Text>
                      <Text variant="body" color="rgba(255,255,255,0.78)" style={{ lineHeight: 22 }}>
                        {article.subtitle}
                      </Text>
                      <Box row align="center" style={{ marginTop: 12 }}>
                        <Clock3 color="rgba(255,255,255,0.65)" size={12} style={{ marginRight: 4 }} />
                        <Text variant="caption" color="rgba(255,255,255,0.65)">
                          {article.read_time_minutes} {t('academyScreen.minutes')}
                        </Text>
                      </Box>
                    </Box>
                  </Pressable>
                ))}
              </Box>
            );
          }}
        />
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
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
