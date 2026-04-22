import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

type Props = {
  seriesA: number[];
  seriesB: number[];
  colorA?: string;
  colorB?: string;
  height?: number;
};

export const DualNormalizedChart: React.FC<Props> = ({
  seriesA,
  seriesB,
  colorA = colors.accent.primary_blue,
  colorB = colors.sentiment.bull_green,
  height = 200,
}) => {
  const { width: screenW } = useWindowDimensions();
  const chartW = Math.max(280, screenW - 48);

  const { pathA, pathB } = useMemo(() => {
    const n = Math.min(seriesA.length, seriesB.length);
    if (n < 2) {
      return { pathA: '', pathB: '' };
    }
    const a = seriesA.slice(-n);
    const b = seriesB.slice(-n);
    const all = [...a, ...b];
    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const span = maxV - minV || 1;
    const pad = 8;
    const innerW = chartW - pad * 2;
    const innerH = height - pad * 2;

    const build = (vals: number[]) => {
      let line = '';
      vals.forEach((v, i) => {
        const x = pad + (i / (vals.length - 1)) * innerW;
        const y = pad + innerH * (1 - (v - minV) / span);
        line += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      });
      return line;
    };

    return { pathA: build(a), pathB: build(b) };
  }, [seriesA, seriesB, chartW, height]);

  if (!pathA || !pathB) {
    return <View style={[styles.ph, { height, width: chartW }]} />;
  }

  return (
    <View style={{ height, width: chartW }}>
      <Svg width={chartW} height={height}>
        <Path
          d={pathA}
          fill="none"
          stroke={colorA}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={pathB}
          fill="none"
          stroke={colorB}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  ph: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
