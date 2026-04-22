import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

type Props = {
  closes: number[];
  stroke?: string;
  height?: number;
};

export const PriceLineChart: React.FC<Props> = ({
  closes,
  stroke = colors.accent.primary_blue,
  height = 200,
}) => {
  const { width: screenW } = useWindowDimensions();
  const chartW = Math.max(280, screenW - 48);

  const lineD = useMemo(() => {
    const vals = closes.filter((n) => Number.isFinite(n));
    if (vals.length < 2) {
      return '';
    }
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const span = maxV - minV || 1;
    const pad = 8;
    const innerW = chartW - pad * 2;
    const innerH = height - pad * 2;

    let line = '';
    vals.forEach((v, i) => {
      const x = pad + (i / (vals.length - 1)) * innerW;
      const y = pad + innerH * (1 - (v - minV) / span);
      line += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    return line;
  }, [closes, chartW, height]);

  if (!lineD) {
    return <View style={[styles.placeholder, { height, width: chartW }]} />;
  }

  return (
    <View style={{ height, width: chartW }}>
      <Svg width={chartW} height={height}>
        <Path
          d={lineD}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
