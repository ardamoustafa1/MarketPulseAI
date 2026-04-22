import React, { useEffect } from 'react';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors } from '../../theme';

export const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box flex={1} bg={colors.background.base} center>
      <Text variant="h1" color={colors.accent.premium_gold}>MarketPulse AI</Text>
      <Text variant="caption" color={colors.text.muted}>Focus Driven Intelligence</Text>
    </Box>
  );
};
