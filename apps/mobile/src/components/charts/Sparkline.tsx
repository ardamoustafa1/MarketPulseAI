import React, { useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Main line color. Area + glow use this as the tint anchor. */
  strokeColor?: string;
  /** Optional 2-stop area gradient. Defaults to a tinted fade of strokeColor. */
  fillColors?: [string, string];
  strokeWidth?: number;
  /** Soft glow halo behind the main line. Set to null to disable. */
  glowColor?: string | null;
  /** Dashed horizontal baseline at the series' first value. */
  showBaseline?: boolean;
  /** Accent dot at the latest datapoint with a pulse halo. */
  showEndDot?: boolean;
}

/**
 * Premium sparkline with Catmull-Rom spline smoothing, layered glow stroke,
 * vertical area gradient with a top shine, dashed anchor baseline, and a
 * glowing end-of-series dot. Purely declarative SVG — renders fast on low-end
 * devices while looking like a fintech hero asset.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 140,
  height = 42,
  strokeColor = '#3BD984',
  fillColors,
  strokeWidth = 2,
  glowColor,
  showBaseline = true,
  showEndDot = true,
}) => {
  const pathIds = useMemo(() => {
    const suffix = Math.random().toString(36).slice(2, 7);
    return {
      area: `sparkArea_${suffix}`,
      stroke: `sparkStroke_${suffix}`,
      shine: `sparkShine_${suffix}`,
      clip: `sparkClip_${suffix}`,
    };
  }, []);

  const { linePath, areaPath, baselineY, endPoint } = useMemo(() => {
    if (data.length < 2) {
      return { linePath: '', areaPath: '', baselineY: height / 2, endPoint: null as null | { x: number; y: number } };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const xStep = width / (data.length - 1);
    const padY = Math.max(4, strokeWidth + 2);

    const points = data.map((value, i) => {
      const x = i * xStep;
      const y = height - padY - ((value - min) / range) * (height - padY * 2);
      return { x, y };
    });

    // Catmull-Rom → cubic Bezier. Smooth, monotone-ish silk curve.
    const d: string[] = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d.push(
        `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      );
    }
    const line = d.join(' ');
    const area = `${line} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`;

    return {
      linePath: line,
      areaPath: area,
      baselineY: points[0].y,
      endPoint: points[points.length - 1],
    };
  }, [data, width, height, strokeWidth]);

  const areaColors = useMemo<[string, string]>(() => {
    if (fillColors) return fillColors;
    // Derive gradient stops from strokeColor when it's a hex value.
    const hex = strokeColor.startsWith('#') ? strokeColor : null;
    if (hex && (hex.length === 7 || hex.length === 4)) {
      const full = hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;
      const r = parseInt(full.slice(1, 3), 16);
      const g = parseInt(full.slice(3, 5), 16);
      const b = parseInt(full.slice(5, 7), 16);
      return [
        `rgba(${r},${g},${b},0.32)`,
        `rgba(${r},${g},${b},0.02)`,
      ];
    }
    return ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)'];
  }, [fillColors, strokeColor]);

  if (!linePath) {
    return null;
  }

  const effectiveGlow = glowColor === null ? null : glowColor ?? strokeColor;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={pathIds.area} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={areaColors[0]} />
          <Stop offset="1" stopColor={areaColors[1]} />
        </LinearGradient>
        <LinearGradient id={pathIds.stroke} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={strokeColor} stopOpacity="0.65" />
          <Stop offset="0.5" stopColor={strokeColor} stopOpacity="0.95" />
          <Stop offset="1" stopColor={strokeColor} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id={pathIds.shine} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.06" />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <ClipPath id={pathIds.clip}>
          <Path d={areaPath} />
        </ClipPath>
      </Defs>

      {/* Dashed baseline at the series origin — anchors the eye. */}
      {showBaseline && (
        <Line
          x1={0}
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke={strokeColor}
          strokeOpacity={0.22}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      )}

      {/* Area fill + top shine clipped to the area shape. */}
      <Path d={areaPath} fill={`url(#${pathIds.area})`} />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={`url(#${pathIds.shine})`}
        clipPath={`url(#${pathIds.clip})`}
      />

      {/* Outer glow: wide, very transparent. */}
      {effectiveGlow && (
        <Path
          d={linePath}
          stroke={effectiveGlow}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.12}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* Inner glow: medium, brighter. */}
      {effectiveGlow && (
        <Path
          d={linePath}
          stroke={effectiveGlow}
          strokeWidth={strokeWidth + 2.5}
          strokeOpacity={0.28}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Crisp primary line with a left→right gradient. */}
      <Path
        d={linePath}
        stroke={`url(#${pathIds.stroke})`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End-of-series dot: halo + core. */}
      {showEndDot && endPoint && (
        <>
          <Circle cx={endPoint.x} cy={endPoint.y} r={strokeWidth + 6} fill={strokeColor} opacity={0.12} />
          <Circle cx={endPoint.x} cy={endPoint.y} r={strokeWidth + 3} fill={strokeColor} opacity={0.28} />
          <Circle cx={endPoint.x} cy={endPoint.y} r={strokeWidth + 1} fill={strokeColor} />
          <Circle cx={endPoint.x} cy={endPoint.y} r={strokeWidth - 0.5} fill="#FFFFFF" opacity={0.9} />
        </>
      )}
    </Svg>
  );
};
