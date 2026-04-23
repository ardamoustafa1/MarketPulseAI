import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme';

interface Candle {
  h: number;
  y: number;
  bull: boolean;
}

const CANDLES: Candle[] = [
  { h: 36, y: 42, bull: true },
  { h: 52, y: 28, bull: true },
  { h: 28, y: 56, bull: false },
  { h: 64, y: 14, bull: true },
  { h: 42, y: 44, bull: false },
  { h: 56, y: 20, bull: true },
  { h: 30, y: 52, bull: false },
  { h: 48, y: 32, bull: true },
];

const CANDLE_WIDTH = 18;
const GAP = 8;

/**
 * Staggered rising candles that fade in from bottom-left to top-right, loop quietly.
 * The bull/bear alternation keeps the animation feeling realistic, not decorative.
 */
export const CandleAnimation: React.FC = () => {
  return (
    <View style={styles.root}>
      {CANDLES.map((c, idx) => (
        <Candle key={idx} candle={c} index={idx} />
      ))}
    </View>
  );
};

const Candle: React.FC<{ candle: Candle; index: number }> = ({ candle, index }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 1800 }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      )
    );
  }, [progress, index]);

  const barStyle = useAnimatedStyle(() => {
    const translateY = (1 - progress.value) * 16;
    const scaleY = 0.3 + progress.value * 0.7;
    return {
      opacity: 0.25 + progress.value * 0.75,
      transform: [{ translateY }, { scaleY }] as unknown as never,
    };
  });

  const color = candle.bull ? colors.sentiment.bull_green : colors.sentiment.bear_red;
  const borderColor = candle.bull ? 'rgba(59,217,132,0.55)' : 'rgba(255,92,92,0.55)';

  return (
    <View style={[styles.slot, { left: index * (CANDLE_WIDTH + GAP) }]}>
      <Animated.View
        style={[
          styles.bar,
          {
            top: candle.y,
            height: candle.h,
            backgroundColor: color,
            borderColor,
          },
          barStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.wick,
          { top: candle.y - 8, backgroundColor: color },
          barStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: (CANDLE_WIDTH + GAP) * CANDLES.length,
    height: 120,
    position: 'relative',
  },
  slot: {
    position: 'absolute',
    top: 0,
    width: CANDLE_WIDTH,
    height: 120,
  },
  bar: {
    position: 'absolute',
    width: CANDLE_WIDTH,
    borderRadius: 4,
    borderWidth: 1,
  },
  wick: {
    position: 'absolute',
    width: 1.5,
    height: 10,
    left: CANDLE_WIDTH / 2 - 0.75,
    opacity: 0.6,
  },
});
