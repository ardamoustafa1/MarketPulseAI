import React, { useEffect } from 'react';
import { StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { useAlertStore } from '../../store/useAlertStore';
import { colors, radius, spacing } from '../../theme';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react-native';
import { formatCurrencyByLocale } from '../../utils/localeFormat';

export const AlertHistoryScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { history, fetchHistory, isLoading, error } = useAlertStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <Box flex={1} bg={colors.background.base}>
      {/* Header */}
      <Box
        row justify="space-between" align="center"
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <Pressable hitSlop={20} onPress={() => navigation?.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Box center style={styles.headerBtn}>
            <ArrowLeft color={colors.text.primary} size={20} />
          </Box>
        </Pressable>
        <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>Alarm Gecmisi</Text>
        <Box style={{ width: 44 }} />
      </Box>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}>
        {error ? (
          <Box style={{ marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,92,92,0.2)', backgroundColor: 'rgba(255,92,92,0.1)' }}>
            <Text variant="caption" color={colors.sentiment.bear_red}>
              {`${error} Sayfayi yenileyerek tekrar dene.`}
            </Text>
          </Box>
        ) : null}
        {isLoading && history.length === 0 ? (
          <Box center padding={spacing.xl}>
            <Text variant="body" color={colors.text.muted}>Gecmis yukleniyor...</Text>
          </Box>
        ) : history.length === 0 ? (
          <GuidedStateCard
            title="Henuz tetiklenen alarm yok"
            description="Kurulu alarmlarin tetiklendiginde bu ekranda zaman sirali olarak gosterilecek."
            ctaLabel="Alarm ekranina don"
            onPress={() => navigation?.goBack()}
            icon={<Clock color={colors.text.muted} size={32} />}
          />
        ) : (
          history.map((event, index) => (
            <Animated.View key={event.id} entering={FadeInUp.delay(index * 40)}>
              <Box row align="center" style={styles.historyCard}>
                <Box center style={styles.iconBadge}>
                  <CheckCircle2 color={colors.sentiment.bull_green} size={20} />
                </Box>
                <Box style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text variant="body" weight="600">Alarm tetiklendi</Text>
                  <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                    {`Tetiklenen fiyat ${formatCurrencyByLocale(event.triggered_price, 'USD')}`}
                  </Text>
                </Box>
              </Box>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(59,217,132,0.1)',
  }
});
