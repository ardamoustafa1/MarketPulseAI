import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export const HeaderBar: React.FC<Props> = ({ title, subtitle, onBack, right }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <BlurView
        intensity={60}
        tint="dark"
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.soft,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        {onBack && (
          <Pressable
            hitSlop={20}
            onPress={onBack}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <ArrowLeft color={colors.text.primary} size={18} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="h3" weight="700" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </BlurView>
    </View>
  );
};
