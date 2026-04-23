import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme';
import {
  Badge,
  BulletList,
  MetricGrid,
  SectionHeader,
  ShellCard,
  SubRow,
} from './primitives';
import type { CryptoMajorDeepCard } from '../../types/deepCard';

export const CryptoMajorCard: React.FC<{ card: CryptoMajorDeepCard }> = ({ card }) => {
  return (
    <View style={{ gap: spacing.md }}>
      <ShellCard>
        <SectionHeader title="Kripto • Derin Kart" caption={card.label} />
        <MetricGrid metrics={card.key_metrics} />
      </ShellCard>

      {card.halving_countdown && (
        <ShellCard>
          <SectionHeader title="Halving Geri Sayımı" />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: spacing.sm,
            }}
          >
            <Text variant="h2" weight="700" mono>
              {card.halving_countdown.days}
            </Text>
            <Text variant="body" color={colors.text.secondary}>
              gün{' '}
              <Text variant="body" mono>
                {card.halving_countdown.hours}
              </Text>{' '}
              saat
            </Text>
          </View>
        </ShellCard>
      )}

      {(card.dominance_pct != null ||
        card.hash_rate_eh != null ||
        card.etf_net_flow_24h_musd != null ||
        card.fear_greed_index != null) && (
        <ShellCard>
          <SectionHeader title="Makro Nabız" />
          {card.dominance_pct != null && (
            <SubRow
              left="Piyasa hakimiyeti"
              right={`%${card.dominance_pct.toFixed(1)}`}
            />
          )}
          {card.hash_rate_eh != null && (
            <SubRow
              left="Hash-rate"
              right={`${card.hash_rate_eh.toFixed(1)} EH/s`}
            />
          )}
          {card.etf_net_flow_24h_musd != null && (
            <SubRow
              left="ETF net akış (24s)"
              right={`${card.etf_net_flow_24h_musd >= 0 ? '+' : ''}${card.etf_net_flow_24h_musd.toFixed(0)} M$`}
              tone={card.etf_net_flow_24h_musd >= 0 ? 'positive' : 'negative'}
            />
          )}
          {card.fear_greed_index != null && (
            <SubRow
              left="Korku & Açgözlülük"
              right={`${card.fear_greed_index.toFixed(0)}/100`}
              tone={
                card.fear_greed_index > 70
                  ? 'negative'
                  : card.fear_greed_index < 30
                    ? 'positive'
                    : 'neutral'
              }
            />
          )}
        </ShellCard>
      )}

      {card.staking && (
        <ShellCard>
          <SectionHeader title="Staking" caption={card.staking.protocol} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="h2" weight="700" mono>
              %{card.staking.apy_pct.toFixed(2)}
            </Text>
            <Badge text="APY" tone="positive" />
          </View>
          {card.staking.note ? (
            <Text
              variant="caption"
              color={colors.text.secondary}
              style={{ marginTop: 4 }}
            >
              {card.staking.note}
            </Text>
          ) : null}
        </ShellCard>
      )}

      {card.liquidation_map.length > 0 && (
        <ShellCard>
          <SectionHeader
            title="Likidasyon Haritası"
            caption="Fiyat bantlarında birikmiş kaldıraç"
          />
          {card.liquidation_map.map((b, i) => (
            <SubRow
              key={`liq-${i}`}
              left={`$${b.price.toFixed(0)} (${b.side})`}
              right={`$${(b.cumulative_usd / 1_000_000).toFixed(1)}M`}
              tone={b.side === 'long' ? 'negative' : 'positive'}
            />
          ))}
        </ShellCard>
      )}

      {card.bullets.length > 0 && (
        <ShellCard>
          <SectionHeader title="Öne Çıkanlar" />
          <BulletList bullets={card.bullets} />
        </ShellCard>
      )}
    </View>
  );
};
