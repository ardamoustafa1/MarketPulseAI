import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme';
import { fetchDeepCard } from '../../api/deepCard';
import type { DeepCardResponse } from '../../types/deepCard';
import { MetalsCard } from './MetalsCard';
import { CryptoMajorCard } from './CryptoMajorCard';
import { CryptoAltCard } from './CryptoAltCard';
import { FxCard } from './FxCard';
import { EquityCard } from './EquityCard';
import { CommodityCard } from './CommodityCard';
import { IndexEtfCard } from './IndexEtfCard';
import { ShellCard } from './primitives';

interface Props {
  symbol: string;
  label?: string;
}

export const DeepCardSection: React.FC<Props> = ({ symbol, label }) => {
  const [data, setData] = useState<DeepCardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDeepCard(symbol, label)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Beklenmeyen hata');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, label]);

  if (loading) {
    return (
      <ShellCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator size="small" color={colors.accent.primary_blue} />
          <Text variant="body" color={colors.text.secondary}>
            Derin kart hazırlanıyor…
          </Text>
        </View>
      </ShellCard>
    );
  }

  if (error || !data) {
    return (
      <ShellCard>
        <Text variant="body" color={colors.sentiment.bear_red}>
          Derin kart yüklenemedi{error ? `: ${error}` : ''}
        </Text>
      </ShellCard>
    );
  }

  const body = (() => {
    if (data.metals) return <MetalsCard card={data.metals} />;
    if (data.crypto_major) return <CryptoMajorCard card={data.crypto_major} />;
    if (data.crypto_alt) return <CryptoAltCard card={data.crypto_alt} />;
    if (data.fx) return <FxCard card={data.fx} />;
    if (data.equity) return <EquityCard card={data.equity} />;
    if (data.commodity) return <CommodityCard card={data.commodity} />;
    if (data.index_etf) return <IndexEtfCard card={data.index_etf} />;
    return (
      <ShellCard>
        <Text variant="body" color={colors.text.secondary}>
          Bu sembol için derin kart desteği henüz yok.
        </Text>
      </ShellCard>
    );
  })();

  return (
    <Animated.View entering={FadeIn.duration(350)} style={{ gap: spacing.md }}>
      {body}
      {data.disclaimers.length > 0 && (
        <View style={{ paddingHorizontal: spacing.xs }}>
          {data.disclaimers.map((d, i) => (
            <Text
              key={`dc-${i}`}
              variant="caption"
              color={colors.text.muted}
              style={{ fontSize: 11, lineHeight: 15 }}
            >
              • {d}
            </Text>
          ))}
        </View>
      )}
    </Animated.View>
  );
};
