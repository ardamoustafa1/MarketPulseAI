import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface Props {
  scrollY: SharedValue<number>;
  symbol: string;
  tint: string;
  size?: number;
}

/**
 * A three-layer parallax badge that shifts subtly during scroll. Use as a
 * hero accent behind asset detail screens. Works with any reanimated scroll
 * handler that writes into the given SharedValue.
 */
export const AssetLogoParallax: React.FC<Props> = ({
  scrollY,
  symbol,
  tint,
  size = 120,
}) => {
  const back = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -18]) }],
    opacity: interpolate(scrollY.value, [0, 200], [0.35, 0.1]),
  }));
  const mid = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -30]) }],
    opacity: interpolate(scrollY.value, [0, 200], [0.55, 0.18]),
  }));
  const front = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 200], [0, -44]);
    const scale = interpolate(scrollY.value, [0, 200], [1, 0.92]);
    return {
      opacity: interpolate(scrollY.value, [0, 200], [1, 0.4]),
      transform: [{ translateY }, { scale }] as any,
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80 }]}
    >
      <Animated.View style={[badgeStyle(size * 1.6, `${tint}11`), back]} />
      <Animated.View style={[badgeStyle(size * 1.2, `${tint}22`), mid, { position: 'absolute', top: 100 }]} />
      <Animated.View
        style={[
          badgeStyle(size, `${tint}44`),
          front,
          {
            position: 'absolute',
            top: 112,
            borderWidth: 1,
            borderColor: tint,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderRadius: 999,
          }}
        >
          <MonoLabel text={symbol.toUpperCase()} />
        </View>
      </Animated.View>
    </View>
  );
};

function badgeStyle(size: number, bg: string) {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bg,
  };
}

const MonoLabel: React.FC<{ text: string }> = ({ text }) => (
  <Animated.Text
    style={{
      color: 'rgba(255,255,255,0.92)',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1.2,
    }}
  >
    {text}
  </Animated.Text>
);
