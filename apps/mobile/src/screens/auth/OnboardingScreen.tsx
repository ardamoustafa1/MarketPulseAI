import React from 'react';
import { Pressable } from 'react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';

export const OnboardingScreen = ({ navigation }: any) => {
  return (
    <Box flex={1} bg={colors.background.base} padding={spacing.lg} justify="flex-end">
      <Text variant="h1" align="center" style={{ marginBottom: spacing.sm }}>Quiet Luxury.</Text>
      <Text variant="body" align="center" color={colors.text.secondary} style={{ marginBottom: spacing.xl }}>
        Next generation portfolio tracking with AI insights. No noise, just data.
      </Text>
      
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Box bg={colors.background.elevated} padding={spacing.md} radius={radius.md} center margin={spacing.sm}>
            <Text variant="h3" color={colors.accent.primary_blue}>Log In</Text>
        </Box>
      </Pressable>
      
      <Pressable onPress={() => navigation.navigate('Register')}>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} center margin={spacing.sm}>
            <Text variant="h3">Join Now</Text>
        </Box>
      </Pressable>
      <Box style={{ height: 40 }} />
    </Box>
  );
};
