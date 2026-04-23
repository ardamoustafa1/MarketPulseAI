import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LucideIcon, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  Icon?: LucideIcon;
  tint?: string;
  style?: ViewStyle;
}

/**
 * A premium, opinionated empty-state. Use anywhere a list is empty so we never
 * leave the user staring at a blank card — each empty state should feel like a
 * door opening to a clear next action.
 */
export const RichEmptyState: React.FC<Props> = ({
  title,
  description,
  ctaLabel,
  onCta,
  Icon = Sparkles,
  tint = colors.accent.premium_gold,
  style,
}) => {
  return (
    <Animated.View entering={FadeInUp.duration(400).springify().damping(20)}>
      <LinearGradient
        colors={[`${tint}22`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: `${tint}33`,
            padding: spacing.xl,
            alignItems: 'center',
            gap: spacing.sm,
          },
          style,
        ]}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${tint}22`,
            borderWidth: 1,
            borderColor: `${tint}55`,
          }}
        >
          <Icon color={tint} size={28} />
        </View>
        <Text variant="h3" weight="700" align="center">
          {title}
        </Text>
        {description && (
          <Text
            variant="caption"
            color={colors.text.secondary}
            align="center"
            style={{ maxWidth: 320 }}
          >
            {description}
          </Text>
        )}
        {ctaLabel && onCta && (
          <Pressable
            onPress={onCta}
            style={({ pressed }) => ({
              marginTop: spacing.sm,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: radius.pill,
              backgroundColor: tint,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text weight="800" color="#141622">
              {ctaLabel}
            </Text>
          </Pressable>
        )}
      </LinearGradient>
    </Animated.View>
  );
};
