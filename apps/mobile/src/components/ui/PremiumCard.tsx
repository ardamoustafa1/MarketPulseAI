import React from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../../theme';

interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  glowColor?: string;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ 
  children, style, delay = 0, glowColor = 'rgba(255,255,255,0.06)' 
}) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).springify().damping(20).stiffness(120)}
      style={[styles.container, style]}
    >
      {/* 
        The true 'Premium' linear look: 
        A gradient border wrap that simulates a light source hitting the top edge. 
      */}
      <LinearGradient
        colors={[glowColor, 'transparent', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientBorderWrap}
      >
        <LinearGradient
          colors={['rgba(30, 33, 43, 0.95)', 'rgba(21, 23, 28, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.innerGlass}
        >
          {children}
        </LinearGradient>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4, // Deep, realistic shadow
    shadowRadius: 32,
    elevation: 10,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  gradientBorderWrap: {
    padding: 1, // acts as a 1px soft glow border
    borderRadius: radius.xl,
  },
  innerGlass: {
    borderRadius: radius.xl - 1,
    overflow: 'hidden',
    padding: 20,
    // Add inner shadow by setting subtle border top
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  }
});
