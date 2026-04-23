import React from 'react';
import { View } from 'react-native';
import { spacing } from '../../theme';
import {
  BulletList,
  MetricGrid,
  SectionHeader,
  ShellCard,
  SubRow,
} from './primitives';
import type { CryptoAltDeepCard } from '../../types/deepCard';

const formatUsd = (n?: number | null): string => {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export const CryptoAltCard: React.FC<{ card: CryptoAltDeepCard }> = ({ card }) => (
  <View style={{ gap: spacing.md }}>
    <ShellCard>
      <SectionHeader title="Alt Kripto • Derin Kart" caption={card.label} />
      <MetricGrid metrics={card.key_metrics} />
    </ShellCard>

    {(card.tvl_usd != null ||
      card.volume_24h_usd != null ||
      card.active_addresses_24h != null ||
      card.realized_vol_24h_pct != null) && (
      <ShellCard>
        <SectionHeader title="Zincir Üstü Sinyaller" />
        {card.tvl_usd != null && <SubRow left="TVL (kilitli)" right={formatUsd(card.tvl_usd)} />}
        {card.volume_24h_usd != null && (
          <SubRow left="24s hacim" right={formatUsd(card.volume_24h_usd)} />
        )}
        {card.active_addresses_24h != null && (
          <SubRow
            left="Aktif cüzdanlar (24s)"
            right={card.active_addresses_24h.toLocaleString('tr-TR')}
          />
        )}
        {card.realized_vol_24h_pct != null && (
          <SubRow
            left="24s gerçekleşmiş volatilite"
            right={`%${card.realized_vol_24h_pct.toFixed(1)}`}
            tone={card.realized_vol_24h_pct > 6 ? 'warning' : 'neutral'}
          />
        )}
      </ShellCard>
    )}

    {card.tr_exchange_spread.length > 0 && (
      <ShellCard>
        <SectionHeader
          title="TR Borsa Spreadi"
          caption="Aynı ürün, farklı borsalar"
        />
        {card.tr_exchange_spread.map((ex, i) => (
          <SubRow
            key={`ex-${i}`}
            left={ex.exchange}
            right={`₺${ex.price_try.toFixed(2)}  (${ex.spread_pct >= 0 ? '+' : ''}${ex.spread_pct.toFixed(2)}%)`}
            tone={Math.abs(ex.spread_pct) > 0.5 ? 'warning' : 'neutral'}
          />
        ))}
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
