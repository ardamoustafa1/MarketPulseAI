import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { Alert, AlertCondition } from '../../store/useAlertStore';
import { colors, radius, spacing } from '../../theme';
import { sentimentPalette } from '../../theme/sentiment';

interface AlertsRailProps {
  alerts: Alert[];
  onPressAlert?: (alert: Alert) => void;
  onPressAll: () => void;
  symbolById?: Record<string, string>;
}

const CONDITION_LABELS: Record<AlertCondition, string> = {
  gt: '>',
  lt: '<',
  pct_up: '▲ %',
  pct_down: '▼ %',
};

export const AlertsRail: React.FC<AlertsRailProps> = ({
  alerts,
  onPressAlert,
  onPressAll,
  symbolById = {},
}) => {
  const { t } = useTranslation();
  const active = alerts.filter((a) => a.is_active).slice(0, 8);

  if (active.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(180).springify().damping(20)}
      style={{ marginBottom: spacing.md }}
    >
      <Box row justify="space-between" align="center" style={{ marginBottom: spacing.sm }}>
        <Box row align="center">
          <Bell color={colors.accent.premium_gold} size={18} style={{ marginRight: 8 }} />
          <Text variant="h3" weight="700">
            {t('alertsRail.title')}
          </Text>
        </Box>
        <Pressable onPress={onPressAll} hitSlop={12}>
          <Box row align="center">
            <Text variant="caption" color={colors.accent.primary_blue} style={{ marginRight: 4 }}>
              {t('alertsRail.viewAll')}
            </Text>
            <ChevronRight color={colors.accent.primary_blue} size={14} />
          </Box>
        </Pressable>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.lg }}
      >
        {active.map((alert) => {
          const symbol = symbolById[alert.asset_id] || alert.asset_id.slice(0, 6).toUpperCase();
          const isPositiveTarget =
            alert.condition === 'gt' || alert.condition === 'pct_up';
          const palette = sentimentPalette(isPositiveTarget ? 3 : -3);
          return (
            <Pressable
              key={alert.id}
              onPress={() => onPressAlert?.(alert)}
              style={({ pressed }) => [
                styles.card,
                { borderColor: palette.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <LinearGradient
                colors={palette.gradient as unknown as readonly [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Box style={{ zIndex: 1 }}>
                <Text variant="caption" color={palette.text} weight="700">
                  {symbol}
                </Text>
                <Text variant="body" weight="700" style={{ marginTop: 4 }} mono>
                  {CONDITION_LABELS[alert.condition]} {alert.target_price}
                </Text>
                <Text
                  variant="caption"
                  color={colors.text.muted}
                  style={{ marginTop: 4 }}
                >
                  {t('alertsRail.watching')}
                </Text>
              </Box>
              <View style={styles.liveDot} />
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 96,
    borderRadius: radius.lg,
    padding: 14,
    marginRight: 10,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(24,26,32,0.7)',
    justifyContent: 'space-between',
  },
  liveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sentiment.bull_green,
  },
});
