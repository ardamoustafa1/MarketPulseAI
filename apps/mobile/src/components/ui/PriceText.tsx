import React, { useEffect, useRef } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { colors, radius, spacing } from '../../theme';

type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

interface PriceTextProps {
  /** Numeric value used to detect meaningful changes and pick the flash color. */
  value: number;
  /** Fully formatted display string (e.g. "$12,345.67"). */
  display: string;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: string;
  weight?: FontWeight;
  style?: TextStyle | TextStyle[];
}

/**
 * A price label that pulses a green/red background flash whenever the value
 * moves up or down. Ignores cosmetic re-renders of the same value.
 */
export const PriceText: React.FC<PriceTextProps> = ({
  value,
  display,
  variant = 'body',
  color,
  weight = '600',
  style,
}) => {
  const prevValue = useRef<number | null>(null);
  const flashIntensity = useSharedValue(0);
  const flashSign = useSharedValue<1 | -1>(1);

  useEffect(() => {
    if (prevValue.current === null) {
      prevValue.current = value;
      return;
    }
    const delta = value - prevValue.current;
    if (Math.abs(delta) < Number.EPSILON * Math.max(1, Math.abs(value))) {
      return;
    }
    flashSign.value = delta > 0 ? 1 : -1;
    flashIntensity.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) })
    );
    prevValue.current = value;
  }, [value, flashIntensity, flashSign]);

  const animatedStyle = useAnimatedStyle(() => {
    const alpha = flashIntensity.value * 0.35;
    const backgroundColor =
      flashSign.value > 0
        ? `rgba(59,217,132,${alpha})`
        : `rgba(255,92,92,${alpha})`;
    return { backgroundColor };
  });

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Text
        variant={variant}
        color={color ?? colors.text.primary}
        weight={weight}
        mono
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        style={[styles.text, style as TextStyle]}
      >
        {display}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  text: {
    textAlign: 'right',
    letterSpacing: -0.3,
  },
});
