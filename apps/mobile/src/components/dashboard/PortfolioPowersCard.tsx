import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, Gauge, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  onPress: () => void;
}

export const PortfolioPowersCard: React.FC<Props> = ({ onPress }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(180).springify().damping(20)}
      style={{ marginBottom: spacing.md }}
    >
      <Pressable
        onPress={async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            // haptics optional
          }
          onPress();
        }}
        style={({ pressed }) => [styles.container, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient
          colors={['rgba(59,217,132,0.25)', 'rgba(74,92,130,0.22)', 'rgba(24,26,32,0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Box style={styles.inner}>
          <Box row align="center" justify="space-between" style={{ marginBottom: 6 }}>
            <Box row align="center">
              <Gauge color={colors.sentiment.bull_green} size={16} style={{ marginRight: 6 }} />
              <Text
                variant="caption"
                weight="700"
                style={{ letterSpacing: 1 }}
                color={colors.sentiment.bull_green}
              >
                PORTFÖY SÜPER GÜÇLERİ
              </Text>
            </Box>
            <ChevronRight color={colors.text.primary} size={18} />
          </Box>
          <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>
            Rakiplerde olmayan 8 pro araç
          </Text>
          <Box row align="center" style={{ marginTop: 6 }}>
            <Sparkles color={colors.accent.premium_gold} size={12} style={{ marginRight: 4 }} />
            <Text variant="caption" color={colors.text.secondary}>
              Çoklu birim · Rebalancer · DCA · Paper orders · Vergi · Hedef · Stres testi · Ortak
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
