import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RatioSignal } from '../../api/intelligence';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  entries: RatioSignal[];
}

const DIRECTION_COLOR: Record<string, string> = {
  extreme_low: colors.sentiment.bear_red,
  low: 'rgba(255,92,92,0.65)',
  normal: colors.text.secondary,
  high: 'rgba(59,217,132,0.65)',
  extreme_high: colors.sentiment.bull_green,
};

export const RatioRadarList: React.FC<Props> = ({ entries }) => {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>{t('intelligence.ratiosTitle')}</Text>
      {entries.map((entry) => {
        const widthPct = Math.max(2, Math.min(100, entry.percentile));
        const directionColor = DIRECTION_COLOR[entry.direction] ?? colors.text.secondary;
        return (
          <Box key={entry.key} style={styles.card}>
            <Box row justify="space-between" align="center">
              <Text variant="body" weight="700">{entry.label}</Text>
              <Text variant="caption" color={directionColor} weight="700">
                {t(`intelligence.ratioDirection.${entry.direction}`)}
              </Text>
            </Box>
            <Text variant="caption" color={colors.text.muted} style={{ marginTop: 4 }} mono>
              {t('intelligence.ratioMeta', {
                value: entry.value.toFixed(3),
                z: entry.z_score.toFixed(2),
                pct: entry.percentile.toFixed(0),
              })}
            </Text>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${widthPct}%`, backgroundColor: directionColor }]} />
            </View>
            {entry.historical_reaction ? (
              <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 6, lineHeight: 18 }}>
                {entry.historical_reaction}
              </Text>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(24,26,32,0.55)',
    marginBottom: 10,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 10,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
});
