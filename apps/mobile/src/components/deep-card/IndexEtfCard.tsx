import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme';
import {
  BulletList,
  MetricGrid,
  SectionHeader,
  ShellCard,
  SubRow,
} from './primitives';
import type { IndexEtfDeepCard } from '../../types/deepCard';

export const IndexEtfCard: React.FC<{ card: IndexEtfDeepCard }> = ({ card }) => {
  const maxWeight = Math.max(1, ...card.sector_weights.map((s) => s.weight_pct));
  return (
    <View style={{ gap: spacing.md }}>
      <ShellCard>
        <SectionHeader
          title={card.asset_class === 'etf' ? 'ETF • Derin Kart' : 'Endeks • Derin Kart'}
          caption={card.label}
        />
        <MetricGrid metrics={card.key_metrics} />
      </ShellCard>

      {card.top_holdings.length > 0 && (
        <ShellCard>
          <SectionHeader title="İlk 10 Ağırlık" />
          {card.top_holdings.slice(0, 10).map((h) => (
            <SubRow
              key={h.symbol}
              left={h.symbol}
              caption={h.name}
              right={`%${h.weight_pct.toFixed(1)}`}
            />
          ))}
        </ShellCard>
      )}

      {card.sector_weights.length > 0 && (
        <ShellCard>
          <SectionHeader title="Sektör Dağılımı" caption="30 günlük momentum rozetli" />
          {card.sector_weights.map((s) => {
            const pct = (s.weight_pct / maxWeight) * 100;
            const mom = s.change_30d_pct ?? 0;
            const momColor =
              mom > 0 ? colors.sentiment.bull_green : mom < 0 ? colors.sentiment.bear_red : colors.text.secondary;
            return (
              <View key={s.sector} style={{ marginVertical: spacing.xs }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 2,
                  }}
                >
                  <Text variant="body" color={colors.text.primary}>
                    {s.sector}
                  </Text>
                  <Text variant="body" weight="600" mono>
                    %{s.weight_pct.toFixed(1)}{' '}
                    <Text variant="caption" style={{ color: momColor }} mono>
                      ({mom >= 0 ? '+' : ''}
                      {mom.toFixed(1)}%)
                    </Text>
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.background.elevated,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: colors.accent.primary_blue,
                      opacity: 0.85,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </ShellCard>
      )}

      {card.bullets.length > 0 && (
        <ShellCard>
          <SectionHeader title="Notlar" />
          <BulletList bullets={card.bullets} />
        </ShellCard>
      )}
    </View>
  );
};
