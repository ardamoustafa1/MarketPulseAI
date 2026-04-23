import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme';
import {
  Badge,
  BulletList,
  Divider,
  MetricGrid,
  SectionHeader,
  ShellCard,
  SubRow,
} from './primitives';
import type { MetalsDeepCard } from '../../types/deepCard';

export const MetalsCard: React.FC<{ card: MetalsDeepCard }> = ({ card }) => {
  const classLabel =
    card.asset_class === 'metal_gold'
      ? 'Altın'
      : card.asset_class === 'metal_silver'
        ? 'Gümüş'
        : 'Platin / Paladyum';

  return (
    <View style={{ gap: spacing.md }}>
      <ShellCard>
        <SectionHeader title={`${classLabel} • Derin Kart`} caption={card.label} />
        <MetricGrid metrics={card.key_metrics} />
      </ShellCard>

      {card.premiums.length > 0 && (
        <ShellCard>
          <SectionHeader title="Primler" caption="Kapalıçarşı fiyatı vs eritme / LBMA" />
          {card.premiums.map((p) => (
            <SubRow
              key={p.symbol}
              left={p.label}
              caption={`Gerçeğe uygun ≈ ${p.fair_value.toFixed(2)}`}
              right={`${p.premium_pct >= 0 ? '+' : ''}${p.premium_pct.toFixed(1)}%`}
              tone={p.verdict === 'rich' ? 'negative' : p.verdict === 'cheap' ? 'positive' : 'neutral'}
            />
          ))}
        </ShellCard>
      )}

      {card.spreads.length > 0 && (
        <ShellCard>
          <SectionHeader title="Spread Radarı" caption="Kapalıçarşı vs bankalar" />
          {card.spreads.map((s, i) => (
            <SubRow
              key={`sp-${i}`}
              left={s.label}
              caption={s.note}
              right={`${s.difference_pct >= 0 ? '+' : ''}${s.difference_pct.toFixed(2)}%`}
              tone={Math.abs(s.difference_pct) > 1 ? 'warning' : 'neutral'}
            />
          ))}
        </ShellCard>
      )}

      {card.lbma_fixes.length > 0 && (
        <ShellCard>
          <SectionHeader title="LBMA Fix Saatleri" caption="Londra referans fiyatları" />
          {card.lbma_fixes.map((f, i) => (
            <SubRow
              key={`fix-${i}`}
              left={f.label}
              caption={f.note ?? undefined}
              right={`${f.time_utc} UTC`}
            />
          ))}
        </ShellCard>
      )}

      {card.inflation_shield_score != null && (
        <ShellCard>
          <SectionHeader title="Enflasyon Kalkanı" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="h2" weight="700" mono>
              {card.inflation_shield_score >= 0 ? '+' : ''}
              {card.inflation_shield_score.toFixed(0)}
            </Text>
            <Badge
              text={card.inflation_shield_score > 25 ? 'GÜÇLÜ' : card.inflation_shield_score < -10 ? 'ZAYIF' : 'NÖTR'}
              tone={
                card.inflation_shield_score > 25
                  ? 'positive'
                  : card.inflation_shield_score < -10
                    ? 'negative'
                    : 'neutral'
              }
            />
          </View>
          {card.shield_narrative ? (
            <Text
              variant="body"
              color={colors.text.secondary}
              style={{ marginTop: spacing.sm }}
            >
              {card.shield_narrative}
            </Text>
          ) : null}
        </ShellCard>
      )}

      {card.target_engine && (
        <ShellCard>
          <SectionHeader title="Hedef Motoru" caption="Mevcut tempoda hedefine ulaşma süresi" />
          <Text variant="body" weight="600" color={colors.text.primary}>
            {card.target_engine.target_label}
          </Text>
          <Divider />
          <SubRow
            left="Aylık ekleme"
            right={`${card.target_engine.monthly_addition.toFixed(1)} adet/gr`}
          />
          <SubRow
            left="Hedef miktar"
            right={`${card.target_engine.target_quantity.toFixed(1)} adet/gr`}
          />
          <SubRow
            left="Kalan süre"
            right={
              card.target_engine.months_to_target != null
                ? `≈ ${Math.round(card.target_engine.months_to_target)} ay`
                : '—'
            }
            tone={
              (card.target_engine.months_to_target ?? 99) < 12 ? 'positive' : 'neutral'
            }
          />
          <Text
            variant="caption"
            color={colors.text.secondary}
            style={{ marginTop: spacing.sm }}
          >
            {card.target_engine.note}
          </Text>
        </ShellCard>
      )}

      {card.bullets.length > 0 && (
        <ShellCard>
          <SectionHeader title="Özet Notlar" />
          <BulletList bullets={card.bullets} />
        </ShellCard>
      )}
    </View>
  );
};
