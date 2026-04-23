import React, { useEffect } from 'react';
import { StyleSheet, Modal, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';
import { CheckCircle, ArrowLeft, Sparkles } from 'lucide-react-native';

interface SuccessOverlayProps {
  visible: boolean;
  type: 'buy' | 'sell';
  assetSymbol: string;
  quantity: string;
  onDismiss: () => void;
}

export const TransactionSuccessOverlay: React.FC<SuccessOverlayProps> = ({
  visible, type, assetSymbol, quantity, onDismiss
}) => {
  const ringScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      ringScale.value = withDelay(
        300,
        withSpring(1, { damping: 12, stiffness: 100 })
      );
      pulseOpacity.value = withDelay(
        500,
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(0, { duration: 600 })
        )
      );
    } else {
      ringScale.value = 0;
      pulseOpacity.value = 0;
    }
  }, [visible, ringScale, pulseOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1.5 }],
  }));

  const isBuy = type === 'buy';
  const accentColor = isBuy ? colors.sentiment.bull_green : colors.sentiment.bear_red;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Box flex={1} center bg="rgba(0,0,0,0.85)" padding={spacing.xl}>

        {/* Pulse Ring */}
        <Animated.View style={[styles.pulseRing, pulseStyle, { borderColor: accentColor }]} />

        {/* Check Circle */}
        <Animated.View style={ringStyle}>
          <Animated.View entering={ZoomIn.delay(200).springify().damping(15)}>
            <LinearGradient
              colors={isBuy
                ? ['rgba(59,217,132,0.2)', 'rgba(59,217,132,0.05)']
                : ['rgba(255,92,92,0.2)', 'rgba(255,92,92,0.05)']
              }
              style={styles.successCircle}
            >
              <CheckCircle color={accentColor} size={56} strokeWidth={1.5} />
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={SlideInUp.delay(400).springify().damping(18)}>
          <Text variant="h1" weight="700" align="center" style={{ marginTop: spacing.xl, letterSpacing: -1 }}>
            Transaction Recorded
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <Box row center style={{ marginTop: spacing.md }}>
            <Sparkles color={colors.accent.premium_gold} size={16} />
            <Text variant="body" color={colors.text.secondary} align="center" style={{ marginLeft: spacing.xs }}>
              Your {isBuy ? 'purchase' : 'sale'} of{' '}
              <Text variant="body" weight="700" color={colors.text.primary}>
                {quantity} {assetSymbol}
              </Text>
              {' '}has been logged.
            </Text>
          </Box>
        </Animated.View>

        {/* Sub message */}
        <Animated.View entering={FadeIn.delay(800).duration(400)}>
          <Text variant="caption" color={colors.text.muted} align="center" style={{ marginTop: spacing.sm, lineHeight: 20 }}>
            Your portfolio has been updated and P&L recalculated.
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeIn.delay(1000).duration(400)} style={{ width: '100%', marginTop: spacing.xxl }}>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Box center padding={spacing.lg} radius={radius.pill} style={styles.dismissBtn}>
              <Box row center>
                <ArrowLeft color={colors.background.base} size={20} style={{ marginRight: spacing.xs }} />
                <Text variant="h3" weight="700" color={colors.background.base}>
                  Back to Portfolio
                </Text>
              </Box>
            </Box>
          </Pressable>
        </Animated.View>

      </Box>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dismissBtn: {
    backgroundColor: colors.text.primary,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
});
