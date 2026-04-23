import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Share2 } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { ShareCardPreview } from '../../components/social/ShareCardPreview';
import { buildShareCard } from '../../api/social';
import type {
  ShareCardKind,
  ShareCardPayload,
  ShareCardRequest,
} from '../../types/social';
import { colors, radius, spacing } from '../../theme';

interface KindOption {
  kind: ShareCardKind;
  label: string;
  desc: string;
  needsSymbol?: boolean;
  decision?: boolean;
  compare?: boolean;
}

const KIND_OPTIONS: KindOption[] = [
  {
    kind: 'asset_snapshot',
    label: 'Varlık anlık',
    desc: 'Seçilen varlığın o anki fiyat / değişim kartı',
    needsSymbol: true,
  },
  {
    kind: 'decision',
    label: 'Bugünkü kararım',
    desc: 'Sanal "AL / BEKLE / SAT" duyurusu',
    needsSymbol: true,
    decision: true,
  },
  {
    kind: 'compare',
    label: 'Karşılaştırma',
    desc: 'Birden fazla varlık yan yana',
    compare: true,
  },
  {
    kind: 'portfolio_wrapped',
    label: 'Portföy Wrapped',
    desc: 'Spotify-vari aylık özet kartı',
  },
  {
    kind: 'dca_result',
    label: 'DCA sonucu',
    desc: 'Son simülasyonun sonuç kartı',
    needsSymbol: true,
  },
  {
    kind: 'streak',
    label: 'Streak',
    desc: 'Üst üste aktif gün rozeti',
  },
  {
    kind: 'goal_progress',
    label: 'Hedef ilerlemesi',
    desc: 'Çoklu-varlıklı hedef yüzdesi',
  },
];

const DECISIONS: Array<'buy' | 'hold' | 'sell'> = ['buy', 'hold', 'sell'];
const DECISION_LABEL: Record<'buy' | 'hold' | 'sell', string> = {
  buy: 'AL',
  hold: 'BEKLE',
  sell: 'SAT',
};

export const ShareCardStudioScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const initialSymbol: string | undefined = route?.params?.symbol;

  const [selectedKind, setSelectedKind] = useState<ShareCardKind>(
    initialSymbol ? 'asset_snapshot' : 'portfolio_wrapped',
  );
  const [symbol, setSymbol] = useState<string>(initialSymbol ?? 'BTC');
  const [extraText, setExtraText] = useState<string>('ETH,XAU_TRY,USDTRY');
  const [decision, setDecision] = useState<'buy' | 'hold' | 'sell'>('buy');
  const [note, setNote] = useState<string>('');
  const [card, setCard] = useState<ShareCardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => KIND_OPTIONS.find((o) => o.kind === selectedKind) ?? KIND_OPTIONS[0],
    [selectedKind],
  );

  const buildPayload = useCallback((): ShareCardRequest => {
    const payload: ShareCardRequest = { kind: selectedKind };
    if (selectedOption.needsSymbol || selectedKind === 'asset_snapshot' || selectedKind === 'dca_result') {
      payload.symbol = symbol.trim().toUpperCase();
    }
    if (selectedOption.compare) {
      payload.symbol = symbol.trim().toUpperCase();
      payload.extra_symbols = extraText
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    }
    if (selectedOption.decision) {
      payload.decision = decision;
    }
    if (note.trim()) {
      payload.note = note.trim();
    }
    return payload;
  }, [selectedKind, selectedOption, symbol, extraText, decision, note]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = buildPayload();
      const result = await buildShareCard(payload);
      setCard(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kart oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  const onShare = async () => {
    if (!card) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      title: card.title,
      message: `${card.title}\n${card.headline}\n\n${card.watermark_text}\n${card.deep_link}`,
      url: card.deep_link,
    });
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Paylaşım Stüdyosu"
        subtitle="Her varlık için 7 tema"
        onBack={() => navigation?.goBack()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        {/* Kind chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {KIND_OPTIONS.map((opt) => {
            const sel = opt.kind === selectedKind;
            return (
              <Pressable
                key={opt.kind}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedKind(opt.kind);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: sel
                    ? colors.accent.primary_blue
                    : colors.background.surface,
                  borderWidth: 1,
                  borderColor: sel ? colors.accent.primary_blue : colors.border.soft,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  color={sel ? '#FFF' : colors.text.secondary}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" color={colors.text.muted}>
          {selectedOption.desc}
        </Text>

        {(selectedOption.needsSymbol || selectedOption.compare) && (
          <View
            style={{
              backgroundColor: colors.background.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border.soft,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text variant="caption" color={colors.text.secondary}>
              Sembol
            </Text>
            <TextInput
              value={symbol}
              onChangeText={setSymbol}
              autoCapitalize="characters"
              placeholder="BTC"
              placeholderTextColor={colors.text.muted}
              style={{
                color: colors.text.primary,
                fontSize: 16,
                paddingVertical: 6,
              }}
            />
            {selectedOption.compare && (
              <>
                <Text variant="caption" color={colors.text.secondary}>
                  Karşılaştırma (virgülle)
                </Text>
                <TextInput
                  value={extraText}
                  onChangeText={setExtraText}
                  autoCapitalize="characters"
                  placeholder="ETH,XAU_TRY,USDTRY"
                  placeholderTextColor={colors.text.muted}
                  style={{
                    color: colors.text.primary,
                    fontSize: 16,
                    paddingVertical: 6,
                  }}
                />
              </>
            )}
          </View>
        )}

        {selectedOption.decision && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {DECISIONS.map((d) => {
              const sel = d === decision;
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setDecision(d);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: sel
                      ? colors.accent.primary_blue
                      : colors.background.surface,
                    borderWidth: 1,
                    borderColor: sel ? colors.accent.primary_blue : colors.border.soft,
                  }}
                >
                  <Text weight="800" color={sel ? '#FFF' : colors.text.primary}>
                    {DECISION_LABEL[d]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View
          style={{
            backgroundColor: colors.background.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border.soft,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text variant="caption" color={colors.text.secondary}>
            Not (opsiyonel)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Bugün neden bu kararı aldın?"
            placeholderTextColor={colors.text.muted}
            style={{
              color: colors.text.primary,
              fontSize: 16,
              paddingVertical: 6,
            }}
          />
        </View>

        <Pressable
          onPress={load}
          style={({ pressed }) => ({
            backgroundColor: colors.accent.premium_gold,
            paddingVertical: 12,
            borderRadius: radius.pill,
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text weight="800" color="#141622">
            {loading ? 'Oluşturuluyor…' : 'Kartı Güncelle'}
          </Text>
        </Pressable>

        {loading && !card && (
          <ActivityIndicator color={colors.accent.premium_gold} />
        )}
        {error && (
          <Text color={colors.sentiment.bear_red} variant="caption">
            {error}
          </Text>
        )}

        {card && (
          <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
            <ShareCardPreview card={card} />
            <Pressable
              onPress={onShare}
              style={({ pressed }) => ({
                marginTop: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: radius.pill,
                backgroundColor: colors.background.elevated,
                borderWidth: 1,
                borderColor: colors.border.stronger,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Share2 color={colors.text.primary} size={18} />
              <Text weight="700">Paylaş</Text>
            </Pressable>
            <Text variant="caption" color={colors.text.muted} style={{ marginTop: 6 }}>
              {card.watermark_text}
            </Text>
          </View>
        )}
      </ScrollView>
    </Box>
  );
};
