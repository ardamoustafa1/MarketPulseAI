import React from 'react';
import { Pressable } from 'react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';

export const ONBOARDING_STEPS = [
  '1) Hesabini ac ve risk profilini sec',
  '2) Ilk islemini gir, benchmarki otomatik baslat',
  '3) Koc aksiyonlarini uygula, haftalik skoru yukselt',
];

export const OnboardingScreen = ({ navigation }: any) => {
  return (
    <Box flex={1} bg={colors.background.base} padding={spacing.lg} justify="flex-end">
      <Text variant="h1" align="center" style={{ marginBottom: spacing.sm }}>Quiet Luxury.</Text>
      <Text variant="body" align="center" color={colors.text.secondary} style={{ marginBottom: spacing.xl }}>
        AI destekli yeni nesil portfoy takibi. Gurultu yok, sadece karar kalitesini artiran veri.
      </Text>

      <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
        {ONBOARDING_STEPS.map((step) => (
          <Text key={step} variant="caption" color={colors.text.secondary}>{step}</Text>
        ))}
      </Box>
      <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
        <Text variant="caption" color={colors.text.secondary}>
          Ilk 10 dakikada:
        </Text>
        <Text variant="caption" color={colors.text.secondary}>• Portfoy gorunurlugu</Text>
        <Text variant="caption" color={colors.text.secondary}>• Ilk risk raporu</Text>
        <Text variant="caption" color={colors.text.secondary}>• Kisisel sonraki adim</Text>
      </Box>
      
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Box bg={colors.background.elevated} padding={spacing.md} radius={radius.md} center margin={spacing.sm}>
            <Text variant="h3" color={colors.accent.primary_blue}>Giris Yap</Text>
        </Box>
      </Pressable>
      
      <Pressable onPress={() => navigation.navigate('Register')}>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} center margin={spacing.sm}>
            <Text variant="h3">Hesap Olustur</Text>
        </Box>
      </Pressable>
      <Box style={{ height: 40 }} />
    </Box>
  );
};
