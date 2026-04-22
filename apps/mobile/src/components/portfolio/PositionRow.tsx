import React from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme';

interface PositionRowProps {
  symbol: string;
  name: string;
  holdingsQty: string;
  currentValue: string;
  unrealizedPnl: string;
  unrealizedPercent: number;
  onPress?: () => void;
}

export const PositionRow: React.FC<PositionRowProps> = ({ 
  symbol, name, holdingsQty, currentValue, unrealizedPnl, unrealizedPercent, onPress
}) => {
  const isPositive = unrealizedPercent >= 0;
  const sentimentColor = isPositive ? colors.sentiment.bull_green : colors.sentiment.bear_red;
  const sign = isPositive ? '+' : '';

  return (
    <Pressable 
      onPress={() => {
        if (Platform.OS !== 'web') {
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }} 
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Box row justify="space-between" align="center" style={styles.container}>
        <Box>
           <Text variant="h3" weight="600" style={{ letterSpacing: -0.3 }}>{symbol}</Text>
           <Text variant="caption" color={colors.text.secondary} weight="500" style={{ marginTop: 4 }}>{holdingsQty} {name}</Text>
        </Box>
        <Box align="flex-end">
           <Text variant="h3" weight="600" style={{ letterSpacing: -0.5, fontSize: 17 }}>{currentValue}</Text>
           <Box row align="center" style={{ marginTop: 6 }}>
              <Text variant="caption" color={sentimentColor} weight="600" style={{ marginRight: 6 }}>{sign}{unrealizedPnl}</Text>
              <Box style={[styles.pill, { backgroundColor: isPositive ? 'rgba(59,217,132,0.1)' : 'rgba(255,92,92,0.1)' }]}>
                 <Text variant="caption" color={sentimentColor} weight="700" style={{ fontSize: 11 }}>{sign}{unrealizedPercent.toFixed(2)}%</Text>
              </Box>
           </Box>
        </Box>
      </Box>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  }
});
