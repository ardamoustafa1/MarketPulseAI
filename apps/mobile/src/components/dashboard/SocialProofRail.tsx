import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { ActivityStats } from '../../store/useStatsStore';
import { colors, radius, spacing } from '../../theme';

interface SocialProofRailProps {
  activity: ActivityStats | null;
}

export const SocialProofRail: React.FC<SocialProofRailProps> = ({ activity }) => {
  const { t } = useTranslation();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 })
      ),
      -1,
      false
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
    transform: [{ scale: 0.9 + pulse.value * 0.2 }],
  }));

  if (!activity) return null;

  const weeklyFormatted = activity.portfolios_updated_this_week.toLocaleString('tr-TR');
  const dauFormatted = activity.active_users_today.toLocaleString('tr-TR');

  return (
    <Animated.View entering={FadeInDown.delay(100).springify().damping(22)}>
      <LinearGradient
        colors={[
          'rgba(74, 92, 130, 0.25)',
          'rgba(74, 92, 130, 0.06)',
          'rgba(74, 92, 130, 0)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <Box row align="center" style={{ zIndex: 1 }}>
          <Box style={{ marginRight: 10 }}>
            <Animated.View style={[styles.dot, dotStyle]} />
          </Box>
          <Users color={colors.accent.primary_blue} size={16} style={{ marginRight: 8 }} />
          <Box flex={1}>
            <Text variant="caption" color={colors.text.primary} weight="700">
              {t('socialProof.weekLine', { count: weeklyFormatted })}
            </Text>
            <Text variant="caption" color={colors.text.muted}>
              {t('socialProof.dauLine', { count: dauFormatted })}
            </Text>
          </Box>
        </Box>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.sentiment.bull_green,
  },
});
