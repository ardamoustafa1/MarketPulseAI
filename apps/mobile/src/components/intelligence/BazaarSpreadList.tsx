import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BazaarSpreadSection } from '../../api/intelligence';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';

interface Props {
  data: BazaarSpreadSection;
}

const verdictColor: Record<string, string> = {
  rich: colors.sentiment.bear_red,
  fair: colors.text.secondary,
  cheap: colors.sentiment.bull_green,
};

export const BazaarSpreadList: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  if (!data.instruments.length) return null;
  return (
    <Box style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" weight="700" style={{ marginBottom: 6 }}>{t('intelligence.bazaarTitle')}</Text>
      <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.sm, lineHeight: 18 }}>
        {data.narrative}
      </Text>
      {data.instruments.map((item) => {
        const color = verdictColor[item.verdict] ?? colors.text.secondary;
        return (
          <Box key={item.symbol} style={styles.row}>
            <Box style={{ flex: 1 }}>
              <Text variant="body" weight="700">{item.label}</Text>
              <Text variant="caption" color={colors.text.muted} mono style={{ marginTop: 2 }}>
                {t('intelligence.bazaarRow', {
                  bazaar: item.bazaar_price.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                  fair: item.fair_value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                })}
              </Text>
            </Box>
            <Box align="flex-end">
              <Text variant="body" weight="700" color={color} mono>
                {item.premium_pct >= 0 ? '+' : ''}{item.premium_pct.toFixed(2)}%
              </Text>
              <Text variant="caption" color={color} weight="700">
                {t(`intelligence.bazaarVerdict.${item.verdict}`)}
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
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(24,26,32,0.55)',
    marginBottom: 8,
  },
});
