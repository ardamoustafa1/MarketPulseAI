import React from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface RangeSelectorProps {
  ranges: string[];
  activeRange: string;
  onChange: (range: string) => void;
}

export const RangeSelector: React.FC<RangeSelectorProps> = ({ ranges, activeRange, onChange }) => {
  return (
    <Box row justify="space-between" style={styles.container}>
      {ranges.map((range) => {
        const isActive = range === activeRange;
        return (
          <Pressable 
            key={range} 
            onPress={() => {
              if (Platform.OS !== 'web') {
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onChange(range);
            }} 
            style={{ flex: 1, paddingHorizontal: 2 }}
          >
            <Box center style={[styles.pill, isActive && styles.pillActive]}>
              <Text 
                variant="caption" 
                weight={isActive ? "600" : "500"} 
                color={isActive ? colors.text.primary : colors.text.muted}
                style={{ fontSize: 14 }}
              >
                {range}
              </Text>
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.pill,
    padding: 3,
    marginVertical: spacing.md,
  },
  pill: {
    height: 32,
    borderRadius: radius.pill,
  },
  pillActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  }
});
