import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Box } from './Box';
import { Text } from './Text';
import { colors, radius, spacing } from '../../theme';

interface CategoryTabsProps {
  categories: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories, activeId, onChange }) => {
  return (
    <Box>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeId;
          const handlePress = () => {
            if (!isActive && Platform.OS !== 'web') {
              Haptics.selectionAsync();
            }
            onChange(cat.id);
          };
          return (
            <Pressable key={cat.id} onPress={handlePress}>
              <Box 
                center 
                style={[
                  styles.tab, 
                  isActive ? styles.tabActive : styles.tabInactive
                ]}
              >
                <Text 
                  variant="caption" 
                  weight={isActive ? "600" : "500"} 
                  color={isActive ? colors.text.primary : colors.text.secondary}
                >
                  {cat.label}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  tab: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabInactive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  }
});
