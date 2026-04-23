import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../../theme';

const SIZE = 260;

/**
 * A slow pulsing gold orb with two halo rings and a faint heart-rate line underneath.
 * Composed of 3 independent Reanimated timelines so it never feels perfectly periodic
 * — the effect reads as "alive market" rather than a loading spinner.
 */
export const GoldPulse: React.FC = () => {
  const outerRing = useSharedValue(0);
  const innerRing = useSharedValue(0);
  const orbGlow = useSharedValue(0.95);
  const pulseX = useSharedValue(-1.0);

  useEffect(() => {
    outerRing.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );
    innerRing.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) })
      ),
      -1,
      false
    );
    orbGlow.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    pulseX.value = withRepeat(
      withTiming(1.2, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
  }, [outerRing, innerRing, orbGlow, pulseX]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + outerRing.value * 0.45 }],
    opacity: 0.6 * (1 - outerRing.value),
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + innerRing.value * 0.25 }],
    opacity: 0.55 * (1 - innerRing.value),
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbGlow.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pulseX.value * SIZE }],
    opacity: 1 - Math.abs(pulseX.value) * 0.8,
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.halo, outerStyle]} />
      <Animated.View style={[styles.halo, styles.haloInner, innerStyle]} />

      <Animated.View style={[styles.orb, orbStyle]}>
        <Svg width={120} height={120}>
          <Defs>
            <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#E9C893" />
              <Stop offset="1" stopColor="#8A6A3E" />
            </LinearGradient>
          </Defs>
          <Circle cx={60} cy={60} r={56} fill="url(#g)" />
          <Circle cx={60} cy={60} r={56} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
          <Path
            d="M60 28 L68 54 L94 54 L74 68 L82 94 L60 80 L38 94 L46 68 L26 54 L52 54 Z"
            fill="rgba(13,14,18,0.5)"
          />
        </Svg>
      </Animated.View>

      <View style={styles.pulseLineWrap} pointerEvents="none">
        <Svg width={SIZE} height={52}>
          <Path
            d="M0 26 L46 26 L58 12 L70 42 L82 18 L94 34 L110 26 L260 26"
            stroke={colors.accent.premium_gold}
            strokeWidth={1.3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.35}
          />
        </Svg>
        <Animated.View style={[styles.pulseDot, pulseStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(200,169,126,0.55)',
    backgroundColor: 'transparent',
  },
  haloInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderColor: 'rgba(200,169,126,0.35)',
  },
  orb: {
    shadowColor: '#C8A97E',
    shadowOpacity: 0.55,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  pulseLineWrap: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    height: 52,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pulseDot: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F3DAA9',
    shadowColor: '#F3DAA9',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
