import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Copy, Gift, Share2 } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { claimReferralCode, fetchReferralCode } from '../../api/social';
import type { ReferralBonusKind, ReferralCode } from '../../types/social';
import { colors, radius, spacing } from '../../theme';

const BONUS_OPTIONS: { code: ReferralBonusKind; label: string; suffix: string }[] = [
  { code: 'silver_grams', label: 'Gümüş puan', suffix: 'gr' },
  { code: 'usdt_points', label: 'USDT puan', suffix: 'USDT' },
  { code: 'gold_quarter', label: 'Çeyrek puan', suffix: 'çeyrek' },
];

export const ReferralScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [bonus, setBonus] = useState<ReferralBonusKind>('silver_grams');
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [enterCode, setEnterCode] = useState('');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const load = useCallback(async (kind: ReferralBonusKind) => {
    setLoading(true);
    try {
      const data = await fetchReferralCode(kind);
      setCode(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(bonus);
  }, [bonus, load]);

  const onCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code.code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onShare = async () => {
    if (!code) return;
    await Haptics.selectionAsync();
    await Share.share({
      title: 'MarketPulse AI davet',
      message: `Seni MarketPulse AI'a davet ediyorum. Kodum: ${code.code}\n${code.share_url}`,
      url: code.share_url,
    });
  };

  const onClaim = async () => {
    if (!enterCode.trim()) return;
    try {
      const res = await claimReferralCode(enterCode.trim().toUpperCase());
      if (res.accepted) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setClaimMessage(
          `Tebrikler! ${res.bonus_awarded} ${
            BONUS_OPTIONS.find((b) => b.code === res.bonus_kind)?.suffix ?? ''
          } puan kazandın.`,
        );
      } else {
        setClaimMessage('Kod geçersiz görünüyor.');
      }
    } catch {
      setClaimMessage('Kodu doğrularken bir hata oluştu.');
    }
  };

  const option = BONUS_OPTIONS.find((o) => o.code === bonus) ?? BONUS_OPTIONS[0];

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Arkadaş Davet Et"
        subtitle="Sanal ama psikolojik güçlü ödüller"
        onBack={() => navigation?.goBack()}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <LinearGradient
          colors={['#2A2111', '#0D0E12']}
          style={{
            borderRadius: radius.lg,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: '#C8A97E44',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Gift color={colors.accent.premium_gold} size={28} />
          <Text variant="h2" weight="800" align="center">
            Davet ettiğin her arkadaş için
          </Text>
          <Text
            variant="h1"
            weight="800"
            color={colors.accent.premium_gold}
            style={{ fontSize: 44, letterSpacing: -1 }}
            mono
          >
            {code ? `${code.bonus_amount} ${option.suffix}` : '— —'}
          </Text>
          <Text variant="caption" color={colors.text.secondary} align="center">
            puan kazan — sanal ama portföyünde rozet olarak gözükür.
          </Text>
        </LinearGradient>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {BONUS_OPTIONS.map((o) => {
            const sel = o.code === bonus;
            return (
              <Pressable
                key={o.code}
                onPress={() => setBonus(o.code)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
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
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && !code && <ActivityIndicator color={colors.accent.premium_gold} />}

        {code && (
          <View
            style={{
              backgroundColor: colors.background.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border.soft,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text variant="caption" color={colors.text.secondary}>
              Senin davet kodun
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  letterSpacing: 4,
                  color: colors.accent.premium_gold,
                }}
                mono
              >
                {code.code}
              </Text>
              <Pressable
                onPress={onCopy}
                style={({ pressed }) => ({
                  padding: 8,
                  borderRadius: radius.sm,
                  backgroundColor: colors.background.elevated,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Copy color={colors.text.primary} size={16} />
              </Pressable>
            </View>
            <Text variant="caption" color={colors.text.muted}>
              {code.claimed_count} arkadaşın bu kodla katıldı
            </Text>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => ({
                marginTop: 4,
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: radius.pill,
                backgroundColor: colors.accent.primary_blue,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Share2 color="#FFF" size={16} />
              <Text color="#FFF" weight="800">
                Arkadaşlarınla paylaş
              </Text>
            </Pressable>
          </View>
        )}

        <View
          style={{
            backgroundColor: colors.background.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border.soft,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text variant="body" weight="700">
            Bir arkadaşın kodunu mu aldın?
          </Text>
          <TextInput
            value={enterCode}
            onChangeText={setEnterCode}
            autoCapitalize="characters"
            placeholder="Davet kodunu gir"
            placeholderTextColor={colors.text.muted}
            style={{
              color: colors.text.primary,
              fontSize: 18,
              letterSpacing: 3,
              paddingVertical: 8,
            }}
          />
          <Pressable
            onPress={onClaim}
            style={({ pressed }) => ({
              paddingVertical: 10,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: colors.accent.premium_gold,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text weight="800" color="#141622">
              Kodu kullan
            </Text>
          </Pressable>
          {claimMessage && (
            <Text variant="caption" color={colors.text.secondary}>
              {claimMessage}
            </Text>
          )}
        </View>
      </ScrollView>
    </Box>
  );
};
