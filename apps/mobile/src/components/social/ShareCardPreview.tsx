import React from 'react';
import { Dimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { spacing, radius } from '../../theme';
import type { ShareCardPayload } from '../../types/social';

const { width: SCREEN_W } = Dimensions.get('window');

const CARD_W = Math.min(SCREEN_W - spacing.lg * 2, 360);
const CARD_H = Math.round(CARD_W * 16 / 9);

const toneColor = (tone: string, fallback: string): string => {
  if (tone === 'positive') return '#3BD984';
  if (tone === 'negative') return '#FF5C5C';
  return fallback;
};

interface Props {
  card: ShareCardPayload;
}

export const ShareCardPreview = React.forwardRef<View, Props>(({ card }, ref) => {
  const { theme } = card;
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: radius.lg,
        overflow: 'hidden',
        alignSelf: 'center',
      }}
    >
      <LinearGradient
        colors={[theme.background, theme.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, padding: spacing.lg }}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              variant="caption"
              color={theme.text}
              weight="700"
              style={{ letterSpacing: 2, opacity: 0.9 }}
            >
              {card.source.toUpperCase()}
            </Text>
            {card.badge ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  backgroundColor: `${theme.accent}33`,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  color={theme.text}
                  style={{ letterSpacing: 1, fontSize: 10 }}
                >
                  {card.badge.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(120).duration(600)}
          style={{ marginTop: spacing.lg }}
        >
          <Text
            variant="h1"
            weight="800"
            color={theme.text}
            style={{ fontSize: 28, letterSpacing: -0.4 }}
          >
            {card.title}
          </Text>
          {card.subtitle ? (
            <Text
              variant="body"
              color={theme.text}
              style={{ marginTop: spacing.xs, opacity: 0.8 }}
            >
              {card.subtitle}
            </Text>
          ) : null}
        </Animated.View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.View entering={FadeInUp.delay(220).duration(700)}>
            <Text
              color={theme.text}
              style={{
                fontSize: 48,
                lineHeight: 54,
                fontWeight: '800',
                letterSpacing: -1.2,
              }}
              mono
            >
              {card.headline}
            </Text>
            {card.subline ? (
              <Text
                color={theme.text}
                style={{
                  marginTop: spacing.sm,
                  fontSize: 16,
                  opacity: 0.85,
                  lineHeight: 22,
                }}
              >
                {card.subline}
              </Text>
            ) : null}
          </Animated.View>
        </View>

        {card.metrics.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(360).duration(600)}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            {card.metrics.slice(0, 3).map((m, i) => (
              <View
                key={`${m.label}-${i}`}
                style={{
                  flexGrow: 1,
                  minWidth: 90,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <Text
                  variant="caption"
                  color={theme.text}
                  style={{ opacity: 0.75, fontSize: 10, letterSpacing: 0.8 }}
                >
                  {m.label.toUpperCase()}
                </Text>
                <Text
                  color={toneColor(m.tone, theme.text)}
                  weight="800"
                  style={{ marginTop: 2, fontSize: 16 }}
                  mono
                >
                  {m.value}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            variant="caption"
            color={theme.text}
            style={{ opacity: 0.7, fontSize: 11 }}
          >
            {card.watermark_text}
          </Text>
          {card.asset_symbol ? (
            <Text
              variant="caption"
              color={theme.accent}
              weight="700"
              style={{ fontSize: 11, letterSpacing: 1 }}
            >
              ${card.asset_symbol.toUpperCase()}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
});

ShareCardPreview.displayName = 'ShareCardPreview';
