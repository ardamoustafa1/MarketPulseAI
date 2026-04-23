import React, { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColors?: [string, string];
  strokeWidth?: number;
}

/**
 * Deterministic sparkline. No animation — downstream parent is responsible for
 * fade-in transitions. Keeps the SVG purely declarative so paths render fast on
 * low-end Android devices.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 140,
  height = 42,
  strokeColor = '#3BD984',
  fillColors = ['rgba(59,217,132,0.25)', 'rgba(59,217,132,0)'],
  strokeWidth = 2,
}) => {
  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) {
      return { linePath: '', areaPath: '' };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const xStep = width / (data.length - 1);

    const points = data.map((value, i) => {
      const x = i * xStep;
      // 2px padding top/bottom so stroke isn't clipped
      const y = height - 2 - ((value - min) / range) * (height - 4);
      return { x, y };
    });

    const d = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');

    const area = `${d} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`;
    return { linePath: d, areaPath: area };
  }, [data, width, height]);

  if (!linePath) {
    return null;
  }

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fillColors[0]} />
          <Stop offset="1" stopColor={fillColors[1]} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#sparkFill)" />
      <Path
        d={linePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
