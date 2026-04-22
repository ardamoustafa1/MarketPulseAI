import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface AllocationItem {
  symbol: string;
  percentage: number;
  color: string;
}

interface AllocationChartProps {
  data: AllocationItem[];
}

export const AllocationChart: React.FC<AllocationChartProps> = ({ data }) => {
  return (
    <Box style={{ marginBottom: spacing.xxl }}>
      <Box row justify="space-between" align="baseline" style={{ marginBottom: spacing.md }}>
        <Text variant="h2" weight="600" style={{ letterSpacing: -0.5 }}>Allocation</Text>
      </Box>

      {/* The Stacked Bar Graphic */}
      <Box row style={styles.barContainer}>
        {data.map((item, index) => (
          <View 
            key={item.symbol} 
            style={[
              styles.barSegment, 
              { 
                width: `${item.percentage}%`, 
                backgroundColor: item.color,
                borderTopLeftRadius: index === 0 ? radius.pill : 0,
                borderBottomLeftRadius: index === 0 ? radius.pill : 0,
                borderTopRightRadius: index === data.length - 1 ? radius.pill : 0,
                borderBottomRightRadius: index === data.length - 1 ? radius.pill : 0,
              }
            ]} 
          />
        ))}
      </Box>

      {/* The Legend */}
      <Box row style={{ flexWrap: 'wrap', marginTop: spacing.md }}>
        {data.map(item => (
          <Box key={item.symbol} row align="center" style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text variant="caption" weight="600" color={colors.text.secondary}>
              {item.symbol} {item.percentage.toFixed(1)}%
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    height: 12,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  legendItem: {
    marginRight: spacing.lg,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  }
});
