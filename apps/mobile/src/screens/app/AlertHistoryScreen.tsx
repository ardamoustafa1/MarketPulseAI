import React, { useEffect } from 'react';
import { StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { useAlertStore } from '../../store/useAlertStore';
import { colors, radius, spacing } from '../../theme';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react-native';

export const AlertHistoryScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { history, fetchHistory, isLoading } = useAlertStore();

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
        <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>Alert History</Text>
        <Box style={{ width: 44 }} />
      </Box>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}>
        {isLoading && history.length === 0 ? (
          <Box center padding={spacing.xl}>
            <Text variant="body" color={colors.text.muted}>Loading history...</Text>
          </Box>
        ) : history.length === 0 ? (
          <Box center padding={spacing.xxl} style={{ marginTop: spacing.xl }}>
            <Box center style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: spacing.md }}>
              <Clock color={colors.text.muted} size={32} />
            </Box>
            <Text variant="h2" weight="700" align="center">No Triggered Alerts</Text>
            <Text variant="body" color={colors.text.muted} align="center" style={{ marginTop: spacing.sm }}>
              When your price alerts trigger, they will appear here.
            </Text>
          </Box>
        ) : (
          history.map((event, index) => (
            <Animated.View key={event.id} entering={FadeInUp.delay(index * 40)}>
              <Box row align="center" style={styles.historyCard}>
                <Box center style={styles.iconBadge}>
                  <CheckCircle2 color={colors.sentiment.bull_green} size={20} />
                </Box>
                <Box style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text variant="body" weight="600">Alert Triggered</Text>
                  <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                    Triggered at ${event.triggered_price}
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
