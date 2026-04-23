import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CarryPair } from '../../api/intelligence';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  pairs: CarryPair[];
}

const verdictColor: Record<string, string> = {
  attractive: colors.sentiment.bull_green,
  neutral: colors.text.secondary,
  avoid: colors.sentiment.bear_red,
};

export const CarryScoreList: React.FC<Props> = ({ pairs }) => {
  const { t } = useTranslation();
  if (!pairs.length) return null;
  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
        {t('intelligence.carryTitle')}
      </Text>
      {pairs.slice(0, 10).map((pair) => {
        const color = verdictColor[pair.verdict] ?? colors.text.secondary;
        return (
          <Box key={pair.pair} style={styles.row}>
            <Box style={{ flex: 1 }}>
              <Text variant="body" weight="700">{pair.pair}</Text>
              <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2, lineHeight: 18 }}>
                {pair.rationale}
              </Text>
            </Box>
            <Box align="flex-end">
              <Text variant="body" weight="700" color={color} mono>
                {pair.score >= 0 ? '+' : ''}{pair.score.toFixed(2)}
              </Text>
              <Text variant="caption" color={color} weight="700">
                {t(`intelligence.carryVerdict.${pair.verdict}`)}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(24,26,32,0.55)',
    marginBottom: 8,
  },
});
