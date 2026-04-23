import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';
import type { Bullet, KeyMetric, Tone } from '../../types/deepCard';

const toneColor = (tone?: Tone | null): string => {
  switch (tone) {
    case 'positive':
      return colors.sentiment.bull_green;
    case 'negative':
      return colors.sentiment.bear_red;
    case 'warning':
      return colors.accent.premium_gold;
    default:
      return colors.text.secondary;
  }
};

export const SectionHeader: React.FC<{ title: string; caption?: string }> = ({
  title,
  caption,
}) => (
  <View style={{ marginBottom: spacing.sm }}>
    <Text variant="h3" weight="700">
      {title}
    </Text>
    {caption ? (
      <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 2 }}>
        {caption}
      </Text>
    ) : null}
  </View>
);

export const MetricTile: React.FC<{ metric: KeyMetric }> = ({ metric }) => (
  <View style={tileStyles.tile}>
    <Text variant="caption" color={colors.text.secondary}>
      {metric.label}
    </Text>
    <Text
      variant="h3"
      weight="700"
      style={{ marginTop: 4, color: toneColor(metric.tone) }}
      mono
    >
      {metric.value}
    </Text>
    {metric.change ? (
      <Text
        variant="caption"
        style={{ marginTop: 2, color: toneColor(metric.tone) }}
        mono
      >
        {metric.change}
      </Text>
    ) : null}
  </View>
);

const tileStyles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    minWidth: 130,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.md,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.soft,
  },
});

export const MetricGrid: React.FC<{ metrics: KeyMetric[] }> = ({ metrics }) => {
  if (!metrics?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {metrics.map((m, i) => (
        <MetricTile key={`${m.label}-${i}`} metric={m} />
      ))}
    </View>
  );
};

export const BulletList: React.FC<{ bullets: Bullet[] }> = ({ bullets }) => {
  if (!bullets?.length) return null;
  return (
    <View style={{ marginTop: spacing.sm, gap: spacing.xs + 2 }}>
      {bullets.map((b, i) => (
        <View
          key={`b-${i}`}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              marginTop: 7,
              backgroundColor: toneColor(b.tone),
            }}
          />
          <Text variant="body" color={colors.text.primary} style={{ flex: 1 }}>
            {b.text}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const SubRow: React.FC<{
  left: string;
  right: string;
  tone?: Tone;
  caption?: string;
}> = ({ left, right, tone, caption }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs + 2,
    }}
  >
    <View style={{ flex: 1, paddingRight: spacing.md }}>
      <Text variant="body" color={colors.text.primary}>
        {left}
      </Text>
      {caption ? (
        <Text variant="caption" color={colors.text.secondary}>
          {caption}
        </Text>
      ) : null}
    </View>
    <Text variant="body" weight="600" mono style={{ color: toneColor(tone) }}>
      {right}
    </Text>
  </View>
);

export const Divider: React.FC = () => (
  <View
    style={{
      height: 1,
      backgroundColor: colors.border.soft,
      marginVertical: spacing.sm,
    }}
  />
);

export const ShellCard: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => (
  <View
    style={[
      {
        padding: spacing.md,
        backgroundColor: colors.background.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border.soft,
      },
      style,
    ]}
  >
    {children}
  </View>
);

export const Badge: React.FC<{ text: string; tone?: Tone }> = ({ text, tone }) => (
  <View
    style={{
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: `${toneColor(tone)}20`,
      borderWidth: 1,
      borderColor: `${toneColor(tone)}55`,
      alignSelf: 'flex-start',
    }}
  >
    <Text
      variant="caption"
      weight="600"
      style={{ color: toneColor(tone), fontSize: 11, letterSpacing: 0.3 }}
    >
      {text.toUpperCase()}
    </Text>
  </View>
);
