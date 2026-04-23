import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Brain, ChevronRight, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';
import { useIntelligenceStore } from '../../store/useIntelligenceStore';

interface Props {
  onPress: () => void;
}

export const IntelligenceHubCard: React.FC<Props> = ({ onPress }) => {
  const { t } = useTranslation();
  const { hub, fetchHub, isLoading } = useIntelligenceStore();

  useEffect(() => {
    if (!hub && !isLoading) {
      void fetchHub();
    }
  }, [hub, isLoading, fetchHub]);

  const portfolio = hub?.today_signals.portfolio ?? null;
  const regime = hub?.regime ?? null;

  const eyebrow = t('intelligence.dashboardEyebrow');
  const headline = portfolio?.headline ?? hub?.regime?.headline ?? t('intelligence.dashboardDefaultHeadline');
  const supporting = regime
    ? t('intelligence.dashboardMeta', {
        regime: t(`intelligence.regime.${regime.regime}`),
        bullish: portfolio?.net_bullish ?? 0,
        bearish: portfolio?.net_bearish ?? 0,
      })
    : t('intelligence.dashboardPrimerMeta');

  return (
    <Animated.View entering={FadeInDown.delay(140).springify().damping(20)} style={{ marginBottom: spacing.md }}>
      <Pressable
        onPress={async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            // haptics unavailable on some devices; ignore silently
          }
          onPress();
        }}
        style={({ pressed }) => [styles.container, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient
          colors={["rgba(148,106,255,0.32)", "rgba(255,196,0,0.18)", "rgba(24,26,32,0.2)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Box style={styles.inner}>
          <Box row align="center" justify="space-between" style={{ marginBottom: 6 }}>
            <Box row align="center">
              <Brain color={colors.accent.premium_gold} size={16} style={{ marginRight: 6 }} />
              <Text variant="caption" weight="700" style={{ letterSpacing: 1 }} color={colors.accent.premium_gold}>
                {eyebrow}
              </Text>
            </Box>
            <ChevronRight color={colors.text.primary} size={18} />
          </Box>
          <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>{headline}</Text>
          <Box row align="center" style={{ marginTop: 6 }}>
            <Sparkles color={colors.accent.primary_blue} size={12} style={{ marginRight: 4 }} />
            <Text variant="caption" color={colors.text.secondary}>{supporting}</Text>
          </Box>
        </Box>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(24,26,32,0.65)',
  },
  inner: {
    padding: spacing.md,
  },
});
