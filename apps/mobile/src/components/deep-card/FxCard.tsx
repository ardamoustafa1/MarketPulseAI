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
import type { FxDeepCard } from '../../types/deepCard';

export const FxCard: React.FC<{ card: FxDeepCard }> = ({ card }) => (
  <View style={{ gap: spacing.md }}>
    <ShellCard>
      <SectionHeader
        title="Döviz • Derin Kart"
        caption={`${card.base_currency}/${card.quote_currency}`}
      />
      <MetricGrid metrics={card.key_metrics} />
    </ShellCard>

    {card.swap_curve.length > 0 && (
      <ShellCard>
        <SectionHeader
          title="Forward / Swap Eğrisi"
          caption="İma edilen faiz farkı"
        />
        {card.swap_curve.map((p) => (
          <SubRow
            key={p.tenor}
            left={p.tenor}
            caption={`Forward puanları ${p.points >= 0 ? '+' : ''}${p.points.toFixed(1)}`}
            right={`%${p.implied_rate_pct.toFixed(2)}`}
          />
        ))}
      </ShellCard>
    )}

    {(card.real_interest_rate_pct != null ||
      card.offshore_vs_onshore_spread_pct != null ||
      card.carry_score != null) && (
      <ShellCard>
        <SectionHeader title="Makro Panel" />
        {card.real_interest_rate_pct != null && (
          <SubRow
            left="Reel faiz"
            right={`%${card.real_interest_rate_pct.toFixed(2)}`}
            tone={card.real_interest_rate_pct > 0 ? 'positive' : 'negative'}
          />
        )}
        {card.offshore_vs_onshore_spread_pct != null && (
          <SubRow
            left="Yurt dışı vs yurt içi"
            right={`${card.offshore_vs_onshore_spread_pct >= 0 ? '+' : ''}${card.offshore_vs_onshore_spread_pct.toFixed(2)}%`}
            tone={Math.abs(card.offshore_vs_onshore_spread_pct) > 1 ? 'warning' : 'neutral'}
          />
        )}
        {card.carry_score != null && (
          <SubRow
            left="Carry skoru"
            right={`${card.carry_score.toFixed(0)} / 100`}
            tone={
              card.carry_score > 55 ? 'positive' : card.carry_score < 35 ? 'negative' : 'neutral'
            }
          />
        )}
      </ShellCard>
    )}

    {card.tcmb_reserves_trend.length > 0 && (
      <ShellCard>
        <SectionHeader title="TCMB Rezerv Trendi" caption="Son 6 ay" />
        {card.tcmb_reserves_trend.slice(-6).map((r) => (
          <SubRow
            key={r.date}
            left={r.date}
            right={`$${r.usd_billions.toFixed(1)} milyar`}
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
