import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BrainCircuit, ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  onPress: () => void;
}

/**
 * Entry point for power-user tools (Pro Tools hub) on the dashboard.
 * Matches the gradient card family used by Intelligence / Portfolio Powers / Social
 * so the home feed remains visually cohesive.
 */
export const ProToolsCard: React.FC<Props> = ({ onPress }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(210).springify().damping(20)}
      style={{ marginBottom: spacing.md }}
    >
      <Pressable
        onPress={async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            /* haptics unavailable */
          }
          onPress();
        }}
        style={({ pressed }) => [styles.container, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient
          colors={[
            'rgba(200,169,126,0.30)',
            'rgba(108,140,255,0.18)',
            'rgba(24,26,32,0.2)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Box style={styles.inner}>
          <Box row align="center" justify="space-between" style={{ marginBottom: 6 }}>
            <Box row align="center">
              <BrainCircuit
                color={colors.accent.premium_gold}
                size={16}
                style={{ marginRight: 6 }}
              />
              <Text
                variant="caption"
                weight="700"
                style={{ letterSpacing: 1 }}
                color={colors.accent.premium_gold}
              >
                PRO ARAÇLAR
              </Text>
            </Box>
            <ChevronRight color={colors.text.primary} size={18} />
          </Box>
          <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>
            Güç kullanıcı cephaneliği
          </Text>
          <Box row align="center" style={{ marginTop: 6 }}>
            <Sparkles
              color={colors.accent.primary_blue}
              size={12}
              style={{ marginRight: 4 }}
            />
            <Text variant="caption" color={colors.text.secondary}>
              Teknik analiz · formül uyarılar · spread · backtest
            </Text>
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
