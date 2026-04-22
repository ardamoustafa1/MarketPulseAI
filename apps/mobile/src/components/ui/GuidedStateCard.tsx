import React from 'react';
import { Pressable } from 'react-native';
import { PremiumCard } from './PremiumCard';
import { Box } from './Box';
import { Text } from './Text';
import { colors, radius, spacing } from '../../theme';

type GuidedStateCardProps = {
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
  icon?: React.ReactNode;
};

export const GuidedStateCard = ({ title, description, ctaLabel, onPress, icon }: GuidedStateCardProps) => (
  <PremiumCard delay={200} style={{ paddingVertical: spacing.xl, alignItems: 'center', marginTop: spacing.lg }}>
    {icon ? (
      <Box
        center
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.05)',
          marginBottom: spacing.lg,
        }}
      >
        {icon}
      </Box>
    ) : null}
    <Text variant="h2" weight="600" style={{ marginBottom: spacing.sm, letterSpacing: -0.5 }}>
      {title}
    </Text>
    <Text
      variant="body"
      color={colors.text.secondary}
      align="center"
      style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md, lineHeight: 24 }}
    >
      {description}
    </Text>
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <Box bg={colors.text.primary} padding={spacing.md} radius={radius.pill}>
        <Text color={colors.background.base} weight="600">{ctaLabel}</Text>
      </Box>
    </Pressable>
  </PremiumCard>
);
