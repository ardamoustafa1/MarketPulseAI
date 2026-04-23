import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type AssetTone = 'gold' | 'cyan' | 'neutral';

interface Props {
  trigger: unknown;
  tone?: AssetTone;
  duration?: number;
  children: React.ReactNode;
  borderRadius?: number;
}

const toneColors = (tone: AssetTone): readonly [string, string, string] => {
  switch (tone) {
    case 'gold':
      return ['transparent', 'rgba(200, 169, 126, 0.55)', 'transparent'];
    case 'cyan':
      return ['transparent', 'rgba(105, 239, 221, 0.45)', 'transparent'];
    default:
      return ['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent'];
  }
};

/**
 * Renders a subtle 80ms sweep whenever `trigger` changes. Use on price cells or
 * hero widgets so the user associates updates with a premium micro-animation.
 */
export const ShineSweep: React.FC<Props> = ({
  trigger,
  tone = 'gold',
  duration = 80,
  children,
  borderRadius = 0,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    runOnUI(() => {
      'worklet';
      progress.value = 0;
      progress.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
    })();
  }, [trigger, duration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 0]),
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-120, 220]),
      },
    ],
  }));

  return (
    <View style={{ overflow: 'hidden', borderRadius }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, style]}
      >
        <LinearGradient
          colors={toneColors(tone)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};
