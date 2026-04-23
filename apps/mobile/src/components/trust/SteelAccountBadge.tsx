import React from 'react';
import { Pressable, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { Text } from '../ui/Text';
import type { SteelAccountView } from '../../types/trust';
import { colors, radius, spacing } from '../../theme';

const TIER_META: Record<
  SteelAccountView['tier'],
  { label: string; tint: string }
> = {
  starter: { label: 'Başlangıç', tint: '#8E93A4' },
  shielded: { label: 'Kalkanlı', tint: '#4A9EDB' },
  steel: { label: 'Çelik', tint: '#C8A97E' },
  titanium: { label: 'Titanium', tint: '#E2B857' },
};

interface Props {
  view: SteelAccountView | null;
  onPress?: () => void;
  compact?: boolean;
}

/**
 * Profile badge visualising security posture. Gamifies 2FA + biometrics +
 * strong password adoption so users opt-in to robust security.
 */
export const SteelAccountBadge: React.FC<Props> = ({
  view,
  onPress,
  compact = false,
}) => {
  if (!view) return null;
  const meta = TIER_META[view.tier];
  const pct = Math.min(100, Math.round((view.score / view.max_score) * 100));

  const content = (
    <View
      style={{
        backgroundColor: colors.background.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: `${meta.tint}55`,
        padding: compact ? spacing.sm : spacing.md,
        gap: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: compact ? 14 : 18,
            backgroundColor: `${meta.tint}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={compact ? 14 : 18} color={meta.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" weight="700" color={meta.tint}>
            {meta.label} hesap
          </Text>
          <Text variant="caption" color={colors.text.secondary}>
            Güvenlik skoru: {view.score}/{view.max_score}
          </Text>
        </View>
        {view.is_steel && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: `${meta.tint}77`,
              backgroundColor: `${meta.tint}22`,
            }}
          >
            <Text variant="caption" weight="700" color={meta.tint}>
              ÇELİK
            </Text>
          </View>
        )}
      </View>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: `${meta.tint}22`,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: 6,
            backgroundColor: meta.tint,
          }}
        />
      </View>
      {!compact && view.next_action && (
        <Text variant="caption" color={colors.text.secondary}>
          {view.next_action}
        </Text>
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {content}
    </Pressable>
  );
};
