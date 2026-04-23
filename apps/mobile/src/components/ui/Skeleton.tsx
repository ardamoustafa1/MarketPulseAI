import React, { useEffect } from 'react';
import { DimensionValue, ViewStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { colors, radius } from '../../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height: DimensionValue;
  style?: ViewStyle;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height, style, circle = false }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.background.elevated,
          borderRadius: circle ? 9999 : radius.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};
