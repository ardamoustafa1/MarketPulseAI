import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react-native';

import { MacroEvent } from '../../api/intelligence';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  events: MacroEvent[];
}

const importanceColor: Record<string, string> = {
  high: colors.sentiment.bear_red,
  medium: '#FFCC4D',
  low: colors.text.secondary,
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export const MacroCalendarList: React.FC<Props> = ({ events }) => {
  const { t } = useTranslation();
  if (events.length === 0) return null;
  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
        {t('intelligence.macroTitle')}
      </Text>
      {events.map((event) => (
        <Box key={event.id} style={styles.card}>
          <Box row justify="space-between" align="center">
            <Box row align="center">
              <Calendar color={colors.accent.premium_gold} size={14} style={{ marginRight: 6 }} />
              <Text variant="caption" color={colors.text.muted} weight="700">
                {event.country}
              </Text>
            </Box>
            <Text variant="caption" color={importanceColor[event.importance] ?? colors.text.secondary} weight="700">
              {t(`intelligence.importance.${event.importance}`)}
            </Text>
          </Box>
          <Text variant="body" weight="700" style={{ marginTop: 6 }}>{event.title}</Text>
          <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 4, lineHeight: 18 }}>
            {event.summary}
          </Text>
          <Text variant="caption" color={colors.text.muted} mono style={{ marginTop: 4 }}>
            {formatDate(event.scheduled_at)}
          </Text>
          {event.expected_impact.length ? (
            <Box row style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
              {event.expected_impact.slice(0, 4).map((sample) => (
                <Box key={`${event.id}-${sample.symbol}`} style={styles.badge}>
                  <Text variant="caption" mono weight="700">
                    {sample.symbol} {sample.mean_pct >= 0 ? '+' : ''}{sample.mean_pct.toFixed(2)}%
                  </Text>
                  <Text variant="caption" color={colors.text.muted} style={{ fontSize: 10 }}>
                    {t('intelligence.winRate', { value: Math.round(sample.win_rate * 100) })}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      ))}
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
