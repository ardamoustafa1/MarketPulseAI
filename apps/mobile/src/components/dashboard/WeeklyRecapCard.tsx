import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ArrowUpRight, CalendarCheck } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface WeeklyRecapCardProps {
  headline?: string;
  subtitle?: string;
  onPress: () => void;
}

export const WeeklyRecapCard: React.FC<WeeklyRecapCardProps> = ({
  headline,
  subtitle,
  onPress,
}) => {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.delay(220).springify().damping(20)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.container, { opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={['rgba(200,169,126,0.35)', 'rgba(20,21,25,0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Box row align="center" style={{ zIndex: 1 }}>
          <Box
            center
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(200,169,126,0.25)',
              marginRight: spacing.md,
            }}
          >
            <CalendarCheck color={colors.accent.premium_gold} size={20} />
          </Box>
          <Box flex={1}>
            <Text variant="caption" color={colors.text.muted}>
              {t('weeklyRecap.eyebrow')}
            </Text>
            <Text variant="h3" weight="700" style={{ marginTop: 2 }} numberOfLines={1}>
              {headline || t('weeklyRecap.defaultHeadline')}
            </Text>
            {subtitle ? (
              <Text
                variant="caption"
                color={colors.text.secondary}
                numberOfLines={2}
                style={{ marginTop: 4 }}
              >
                {subtitle}
              </Text>
            ) : null}
          </Box>
          <ArrowUpRight color={colors.text.secondary} size={18} />
        </Box>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(200,169,126,0.3)',
    overflow: 'hidden',
  },
});
