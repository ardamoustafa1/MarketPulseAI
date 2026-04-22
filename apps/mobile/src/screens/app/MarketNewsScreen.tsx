import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, spacing } from '../../theme';

type Item = { title: string; link: string | null; source: string; published: string | null };

export const MarketNewsScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Item[]>('/api/v1/market-news/', { params: { limit: 30 } });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box flex={1} bg={colors.background.base} style={{ paddingTop: insets.top }}>
      <Box row align="center" justify="space-between" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h2" weight="600">
          {t('common:news')}
        </Text>
        <Pressable onPress={() => void load()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <RefreshCw color={colors.text.secondary} size={22} />
        </Pressable>
      </Box>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 40 }}>
        <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.lg }}>
          RSS — indicative headlines only.
        </Text>
        {loading ? (
          <Text color={colors.text.secondary}>…</Text>
        ) : (
          items.map((it, idx) => (
            <Pressable
              key={`${it.title}-${idx}`}
              onPress={() => it.link && Linking.openURL(it.link)}
              disabled={!it.link}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: spacing.md }]}
            >
              <Box style={styles.card}>
                <Text variant="caption" color={colors.accent.premium_gold} style={{ marginBottom: 4 }}>
                  {it.source}
                </Text>
                <Text variant="body" weight="500">
                  {it.title}
                </Text>
                {it.published ? (
                  <Text variant="caption" color={colors.text.muted} style={{ marginTop: 6 }}>
                    {it.published}
                  </Text>
                ) : null}
              </Box>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
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
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
