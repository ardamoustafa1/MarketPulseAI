import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../ui/Text';
import { AssetHero3D, type HeroClass } from './AssetHero3D';

interface Props {
  assetClass: HeroClass;
  title: string;
  subtitle?: string;
  visible: boolean;
  onFinish: () => void;
  durationMs?: number;
}

/**
 * Runs a 5-second asset-specific "opening" intro overlay — for BIST 10:00,
 * FX close, crypto daily UTC rollover, etc. Auto-dismisses after durationMs.
 */
export const OpeningCeremony: React.FC<Props> = ({
  assetClass,
  title,
  subtitle,
  visible,
  onFinish,
  durationMs = 5000,
}) => {
  const fade = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    fade.value = 0;
    fade.value = withSequence(
      withTiming(1, { duration: 600 }),
      withTiming(1, { duration: durationMs - 1200 }),
      withTiming(0, { duration: 600 }, (finished) => {
        if (finished) {
          onFinish();
        }
      }),
    );
  }, [visible, durationMs, fade, onFinish]);

  const style = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={[StyleSheet.absoluteFill, { zIndex: 100 }, style]}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.92)', 'rgba(10,11,14,0.98)']}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <AssetHero3D assetClass={assetClass} size={200} />
        <Text
          variant="h1"
          weight="800"
          align="center"
          color="#FFFFFF"
          style={{ marginTop: 24, fontSize: 32, letterSpacing: -0.6 }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            variant="body"
            align="center"
            color="rgba(255,255,255,0.75)"
            style={{ marginTop: 8 }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};
