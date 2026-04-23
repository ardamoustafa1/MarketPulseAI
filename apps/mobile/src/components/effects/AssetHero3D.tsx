import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

export type HeroClass =
  | 'metal'
  | 'crypto_major'
  | 'crypto_alt'
  | 'fx'
  | 'equity'
  | 'commodity'
  | 'index_etf'
  | 'unknown';

interface Props {
  assetClass: HeroClass;
  symbol?: string;
  size?: number;
}

const THEME: Record<HeroClass, { primary: string; accent: string; bg: string }> = {
  metal: { primary: '#C8A97E', accent: '#F7E3B6', bg: '#2A2111' },
  crypto_major: { primary: '#F7931A', accent: '#FFD27A', bg: '#1A130A' },
  crypto_alt: { primary: '#7C6CFF', accent: '#C4BCFF', bg: '#150F2A' },
  fx: { primary: '#37A3C7', accent: '#B9E0EB', bg: '#0B1E25' },
  equity: { primary: '#3BD984', accent: '#C2F5D9', bg: '#0D211A' },
  commodity: { primary: '#E2A649', accent: '#FFE1B0', bg: '#21180A' },
  index_etf: { primary: '#4A5C82', accent: '#B9C4D7', bg: '#101521' },
  unknown: { primary: '#8E93A4', accent: '#C2C5CE', bg: '#15171C' },
};

/**
 * Class-specific animated hero art. Uses react-native-svg (already installed)
 * plus a slow reanimated rotation so it feels 3D-ish without native Skia.
 * Works in Expo Go.
 */
export const AssetHero3D: React.FC<Props> = ({ assetClass, size = 160 }) => {
  const theme = THEME[assetClass] ?? THEME.unknown;
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = 0;
    spin.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin, assetClass]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${spin.value * 360}deg` }, { perspective: 600 } as any],
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${theme.primary}55`,
      }}
    >
      <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, spinStyle]}>
        <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={theme.accent} stopOpacity={1} />
              <Stop offset="1" stopColor={theme.primary} stopOpacity={1} />
            </SvgLinearGradient>
          </Defs>
          <ClassShape klass={assetClass} />
        </Svg>
      </Animated.View>
    </View>
  );
};

const ClassShape: React.FC<{ klass: HeroClass }> = ({ klass }) => {
  switch (klass) {
    case 'metal':
      return <Rect x={15} y={30} width={70} height={40} rx={6} fill="url(#g)" />;
    case 'crypto_major':
    case 'crypto_alt':
      return (
        <>
          <Circle cx={50} cy={50} r={36} fill="url(#g)" />
          <Path
            d="M42 30 h14 a10 10 0 0 1 0 20 h-14 z M42 50 h16 a10 10 0 0 1 0 20 h-16 z"
            fill="#00000033"
          />
        </>
      );
    case 'fx':
      return (
        <Path
          d="M0 60 Q25 30 50 60 T100 60 V100 H0 Z"
          fill="url(#g)"
        />
      );
    case 'equity':
      return (
        <>
          <Rect x={18} y={50} width={10} height={30} fill="url(#g)" />
          <Rect x={34} y={30} width={10} height={50} fill="url(#g)" />
          <Rect x={50} y={42} width={10} height={38} fill="url(#g)" />
          <Rect x={66} y={20} width={10} height={60} fill="url(#g)" />
        </>
      );
    case 'commodity':
      return (
        <>
          <Rect x={30} y={18} width={40} height={64} rx={6} fill="url(#g)" />
          <Rect x={30} y={32} width={40} height={2} fill="#00000033" />
          <Rect x={30} y={48} width={40} height={2} fill="#00000033" />
          <Rect x={30} y={64} width={40} height={2} fill="#00000033" />
        </>
      );
    case 'index_etf':
      return (
        <Polygon
          points="50,15 85,40 72,85 28,85 15,40"
          fill="url(#g)"
        />
      );
    default:
      return <Circle cx={50} cy={50} r={36} fill="url(#g)" />;
  }
};
