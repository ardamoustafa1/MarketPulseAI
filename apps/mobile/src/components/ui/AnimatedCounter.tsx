import React, { useEffect } from 'react';
import { TextStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';

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

interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /**
   * Formatter used to render the intermediate frames. Defaults to locale-aware,
   * fixed-decimal formatter. Kept pluggable so currency callers can inject their
   * own formatters (e.g. `formatCurrency`).
   */
  format?: (value: number) => string;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: string;
  weight?: FontWeight;
  style?: TextStyle | TextStyle[];
}

const defaultFormat = (n: number, decimals: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  durationMs = 900,
  decimals = 2,
  prefix = '',
  suffix = '',
  format,
  variant = 'h1',
  color,
  weight = '700',
  style,
}) => {
  const progress = useSharedValue(value);
  const [display, setDisplay] = React.useState(() =>
    `${prefix}${format ? format(value) : defaultFormat(value, decimals)}${suffix}`
  );

  useEffect(() => {
    progress.value = withTiming(value, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, durationMs, progress]);

  // Format on the JS thread. The reaction worklet only forwards the raw
  // numeric value so we never call a non-worklet closure (e.g. `format` prop)
  // from the UI thread, which crashes with Reanimated 4 + Hermes.
  const applyDisplay = React.useCallback(
    (current: number) => {
      const formatted = format ? format(current) : defaultFormat(current, decimals);
      setDisplay(`${prefix}${formatted}${suffix}`);
    },
    [decimals, prefix, suffix, format]
  );

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(applyDisplay)(current);
    },
    [applyDisplay]
  );

  return (
    <Animated.View>
      <Text
        variant={variant}
        color={color}
        weight={weight}
        mono
        style={style}
        allowFontScaling={false}
      >
        {display}
      </Text>
    </Animated.View>
  );
};
