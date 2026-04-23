import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme';
import {
  BulletList,
  MetricGrid,
  SectionHeader,
  ShellCard,
  SubRow,
} from './primitives';
import type { EquityDeepCard } from '../../types/deepCard';

export const EquityCard: React.FC<{ card: EquityDeepCard }> = ({ card }) => (
  <View style={{ gap: spacing.md }}>
    <ShellCard>
      <SectionHeader title="Hisse • Derin Kart" caption={card.label} />
      <MetricGrid metrics={card.key_metrics} />
    </ShellCard>

    {(card.pe_ratio != null ||
      card.pb_ratio != null ||
      card.dividend_yield_pct != null ||
      card.beta != null ||
      card.market_cap_musd != null) && (
      <ShellCard>
        <SectionHeader title="Temel Analiz" />
        {card.pe_ratio != null && <SubRow left="F/K" right={card.pe_ratio.toFixed(1)} />}
        {card.pb_ratio != null && <SubRow left="PD/DD" right={card.pb_ratio.toFixed(2)} />}
        {card.dividend_yield_pct != null && (
          <SubRow
            left="Temettü verimi"
            right={`%${card.dividend_yield_pct.toFixed(2)}`}
            tone="positive"
          />
        )}
        {card.beta != null && <SubRow left="Beta" right={card.beta.toFixed(2)} />}
        {card.market_cap_musd != null && (
          <SubRow
            left="Piyasa değeri"
            right={`$${(card.market_cap_musd / 1000).toFixed(1)} milyar`}
          />
        )}
      </ShellCard>
    )}

    {card.technical && (
      <ShellCard>
        <SectionHeader title="AI Teknik Yorum" />
        {card.technical.rsi_14 != null && (
          <SubRow
            left="RSI (14)"
            right={card.technical.rsi_14.toFixed(1)}
            tone={
              card.technical.rsi_14 > 70
                ? 'negative'
                : card.technical.rsi_14 < 30
                  ? 'positive'
                  : 'neutral'
            }
          />
        )}
        {card.technical.macd != null && card.technical.macd_signal != null && (
          <SubRow
            left="MACD / Sinyal"
            right={`${card.technical.macd.toFixed(2)} / ${card.technical.macd_signal.toFixed(2)}`}
            tone={card.technical.macd > card.technical.macd_signal ? 'positive' : 'negative'}
          />
        )}
        {card.technical.fib_level != null && (
          <SubRow
            left="Fib seviyesi"
            right={card.technical.fib_level.toFixed(3)}
          />
        )}
        {card.technical.narrative ? (
          <Text
            variant="body"
            color={colors.text.secondary}
            style={{ marginTop: spacing.sm }}
          >
            {card.technical.narrative}
          </Text>
        ) : null}
      </ShellCard>
    )}

    {card.earnings_calendar.length > 0 && (
      <ShellCard>
        <SectionHeader title="Kazanç Takvimi" />
        {card.earnings_calendar.map((e) => (
          <SubRow
            key={e.date}
            left={e.date}
            caption={e.note ?? undefined}
            right={
              e.eps_estimate != null
                ? `EPS ${e.eps_estimate.toFixed(2)}`
                : e.revenue_estimate_musd != null
                  ? `${e.revenue_estimate_musd.toFixed(0)} M$`
                  : '—'
            }
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
