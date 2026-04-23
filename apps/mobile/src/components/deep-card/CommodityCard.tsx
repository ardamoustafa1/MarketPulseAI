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
import type { CommodityDeepCard } from '../../types/deepCard';

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const CommodityCard: React.FC<{ card: CommodityDeepCard }> = ({ card }) => {
  const max = Math.max(1, ...card.seasonal_pattern.map((m) => Math.abs(m.mean_return_pct)));
  return (
    <View style={{ gap: spacing.md }}>
      <ShellCard>
        <SectionHeader title="Emtia • Derin Kart" caption={card.label} />
        <MetricGrid metrics={card.key_metrics} />
      </ShellCard>

      {card.seasonal_pattern.length > 0 && (
        <ShellCard>
          <SectionHeader
            title="Mevsimsel Örüntü"
            caption="Son 10 yıl ortalama aylık getiri"
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              height: 120,
              gap: 4,
              marginTop: spacing.sm,
            }}
          >
            {card.seasonal_pattern.map((m) => {
              const h = (Math.abs(m.mean_return_pct) / max) * 90 + 6;
              const positive = m.mean_return_pct >= 0;
              return (
                <View key={m.month} style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={{
                      height: h,
                      width: '70%',
                      backgroundColor: positive
                        ? colors.sentiment.bull_green
                        : colors.sentiment.bear_red,
                      borderRadius: radius.sm,
                      opacity: 0.25 + (m.hit_rate_pct / 100) * 0.7,
                    }}
                  />
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    style={{ fontSize: 9, marginTop: 2 }}
                  >
                    {MONTHS_TR[m.month - 1]}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text
            variant="caption"
            color={colors.text.secondary}
            style={{ marginTop: spacing.sm }}
          >
            Opaklık = tarihsel isabet oranı. Yüksek renk doygunluğu = güvenilir örüntü.
          </Text>
        </ShellCard>
      )}

      {(card.supply_note || card.usd_correlation_90d != null) && (
        <ShellCard>
          <SectionHeader title="Makro Notu" />
          {card.supply_note ? (
            <Text
              variant="body"
              color={colors.text.primary}
              style={{ marginBottom: spacing.sm }}
            >
              {card.supply_note}
            </Text>
          ) : null}
          {card.usd_correlation_90d != null && (
            <SubRow
              left="USD ile 90g korelasyon"
              right={card.usd_correlation_90d.toFixed(2)}
              tone={
                card.usd_correlation_90d < -0.4
                  ? 'positive'
                  : card.usd_correlation_90d > 0.4
                    ? 'negative'
                    : 'neutral'
              }
            />
          )}
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
