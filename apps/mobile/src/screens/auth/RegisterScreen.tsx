import React from 'react';
import { Pressable } from 'react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, spacing } from '../../theme';

export const RegisterScreen = ({ navigation }: any) => {
  return (
    <Box flex={1} bg={colors.background.base} padding={spacing.lg} justify="center">
      <Text variant="h2" style={{ marginBottom: spacing.xl }}>Create Account</Text>
      
      <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }}>
         <Text align="center" color={colors.text.muted}>Back to Start</Text>
      </Pressable>
    </Box>
  );
};
