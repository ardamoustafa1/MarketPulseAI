import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CorrelationSection } from '../../api/intelligence';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  data: CorrelationSection;
}

/**
 * Red → white → green diverging gradient.
 *  -1.0  →  rgba(255,92,92,X)
 *   0.0  →  rgba(255,255,255,0.08)
 *  +1.0  →  rgba(59,217,132,X)
 */
function colorForValue(value: number): string {
  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    const alpha = 0.12 + v * 0.55;
    return `rgba(59,217,132,${alpha.toFixed(2)})`;
  }
  const alpha = 0.12 + Math.abs(v) * 0.55;
  return `rgba(255,92,92,${alpha.toFixed(2)})`;
}

export const CorrelationHeatmap: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  if (!data.symbols.length || !data.matrix.length) return null;

  const n = data.symbols.length;
  const cellSize = 28;

  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
        {t('intelligence.correlationTitle', { window: data.window_days })}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ width: cellSize + 6 }} />
        <View style={{ flexDirection: 'row' }}>
          {data.symbols.map((sym) => (
            <Text
              key={`col-${sym}`}
              variant="caption"
              color={colors.text.muted}
              style={{
                width: cellSize,
                textAlign: 'center',
                fontSize: 10,
                letterSpacing: 0.2,
                transform: [{ rotate: '-28deg' }],
              }}
            >
              {sym}
            </Text>
          ))}
        </View>
      </View>

      {data.symbols.map((rowSym, i) => (
        <View key={`row-${rowSym}`} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
          <Text variant="caption" color={colors.text.muted} style={{ width: cellSize + 6, fontSize: 10 }} align="right">
            {rowSym}
          </Text>
          {data.matrix[i].slice(0, n).map((value, j) => (
            <View
              key={`cell-${i}-${j}`}
              style={[
                styles.cell,
                { backgroundColor: colorForValue(value), width: cellSize, height: cellSize },
              ]}
            >
              <Text variant="caption" style={{ fontSize: 9, fontWeight: '700' }}>
                {value.toFixed(1)}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {data.highlights.length > 0 ? (
        <Box style={{ marginTop: spacing.md }}>
          {data.highlights.map((h) => (
            <Text key={`hi-${h.pair.join('-')}`} variant="caption" color={colors.text.secondary} style={{ marginBottom: 4, lineHeight: 18 }}>
              • {h.message}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

const styles = StyleSheet.create({
  cell: {
    borderRadius: radius.sm,
    marginRight: 2,
    marginBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
});
