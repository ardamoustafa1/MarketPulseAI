import React from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { PremiumCard } from '../ui/PremiumCard';
import { colors, spacing } from '../../theme';
import { Sparkles, ArrowRight, ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface AISummaryCardProps {
  summary: string;
  actionText?: string;
  onPressAction?: () => void;
}

export const AISummaryCard: React.FC<AISummaryCardProps> = ({ summary, actionText, onPressAction }) => {
  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressAction?.();
  };

  return (
    <Pressable onPress={onPressAction ? handlePress : undefined} style={({ pressed }) => [{ opacity: pressed && onPressAction ? 0.85 : 1 }]}>
      <PremiumCard delay={300} style={styles.card}>
        <Box row align="flex-start">
          <Box style={styles.iconContainer} center>
            <Sparkles color={colors.accent.premium_gold} size={20} />
          </Box>
          <Box flex={1} style={{ marginLeft: spacing.md }}>
            <Text variant="h3" color={colors.accent.premium_gold} style={{ marginBottom: spacing.xs }}>
              AI Market Insight
            </Text>
            <Text variant="body" color={colors.text.secondary} style={{ lineHeight: 22 }}>
              {summary}
            </Text>

            {actionText && (
              <Box row align="center" style={{ marginTop: spacing.md }}>
                <Text variant="caption" color={colors.text.primary} weight="600" style={{ marginRight: spacing.xs }}>
                  {actionText}
                </Text>
                <ArrowRight color={colors.text.primary} size={14} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Inline Disclaimer */}
        <Box row align="center" style={styles.disclaimer}>
          <ShieldAlert color={colors.text.muted} size={10} style={{ marginRight: 4 }} />
          <Text variant="caption" color={colors.text.muted} style={{ fontSize: 10 }}>
            AI-generated · Not financial advice
          </Text>
        </Box>
      </PremiumCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
    // Add subtle glow shadow to the card itself via PremiumCard wrapper
    shadowColor: colors.accent.premium_gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(200, 169, 126, 0.1)', // premium gold generic tint
  },
  disclaimer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
});
