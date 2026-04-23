import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Database,
  ExternalLink,
  FileText,
  Newspaper,
  Shield,
  Sparkles,
} from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchDisclaimer, fetchTransparency } from '../../api/trust';
import type { DisclaimerView, ProviderEntry, TransparencyView } from '../../types/trust';
import { colors, radius, spacing } from '../../theme';

const CATEGORY_META: Record<
  ProviderEntry['category'],
  { label: string; icon: any; tint: string }
> = {
  market_data: { label: 'Piyasa Verisi', icon: Database, tint: '#69EFDD' },
  macro: { label: 'Makro', icon: Sparkles, tint: '#7C6CFF' },
  fx: { label: 'FX', icon: Sparkles, tint: '#4A9EDB' },
  commodity: { label: 'Emtia', icon: Sparkles, tint: '#E2A649' },
  news: { label: 'Haber', icon: Newspaper, tint: '#FF8A5B' },
  security: { label: 'Güvenlik', icon: Shield, tint: '#3BD984' },
};

export const TransparencyScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<TransparencyView | null>(null);
  const [disclaimer, setDisclaimer] = useState<DisclaimerView | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchTransparency(), fetchDisclaimer('tr')])
      .then(([t, d]) => {
        if (!active) return;
        setData(t);
        setDisclaimer(d);
      })
      .catch(() => {
        /* noop */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Şeffaflık"
        subtitle="Veri sağlayıcıları & politika"
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
        {!data && <ActivityIndicator color={colors.accent.premium_gold} />}

        {disclaimer && (
          <Animated.View entering={FadeInUp.springify().damping(18)}>
            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                gap: 6,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Shield size={18} color={colors.accent.premium_gold} />
                <Text variant="body" weight="700">
                  {disclaimer.title}
                </Text>
              </View>
              <Text variant="caption" color={colors.text.secondary}>
                {disclaimer.body}
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                {disclaimer.version} · {disclaimer.effective_at.slice(0, 10)}
              </Text>
            </View>
          </Animated.View>
        )}

        {data && (
          <>
            <Text variant="caption" color={colors.text.muted}>
              Veri sağlayıcıları ({data.providers.length})
            </Text>
            {data.providers.map((p, i) => {
              const meta = CATEGORY_META[p.category];
              const Icon = meta.icon;
              return (
                <Animated.View
                  key={p.code}
                  entering={FadeInUp.delay(i * 30).springify().damping(18)}
                >
                  <Pressable
                    disabled={!p.website_url}
                    onPress={() =>
                      p.website_url && Linking.openURL(p.website_url)
                    }
                    style={({ pressed }) => ({
                      backgroundColor: colors.background.surface,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border.soft,
                      padding: spacing.md,
                      opacity: pressed ? 0.7 : 1,
                      gap: 6,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: `${meta.tint}22`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={16} color={meta.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="caption" weight="700">
                          {p.name}
                        </Text>
                        <Text variant="caption" color={colors.text.muted}>
                          {meta.label}
                        </Text>
                      </View>
                      {p.website_url && (
                        <ExternalLink size={14} color={colors.text.muted} />
                      )}
                    </View>
                    <Text variant="caption" color={colors.text.secondary}>
                      {p.description}
                    </Text>
                    {p.coverage.length > 0 && (
                      <Text variant="caption" color={colors.text.muted}>
                        Kapsam: {p.coverage.join(', ')}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}

            {data.policies.length > 0 && (
              <>
                <Text variant="caption" color={colors.text.muted}>
                  Politikalar
                </Text>
                {data.policies.map((pol) => (
                  <Pressable
                    key={pol.code}
                    onPress={() => Linking.openURL(pol.url)}
                    style={{
                      backgroundColor: colors.background.surface,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border.soft,
                      padding: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <FileText size={16} color={colors.accent.premium_gold} />
                    <Text variant="caption" weight="700" style={{ flex: 1 }}>
                      {pol.title}
                    </Text>
                    <ExternalLink size={14} color={colors.text.muted} />
                  </Pressable>
                ))}
              </>
            )}

            <Text
              variant="caption"
              color={colors.text.muted}
              align="center"
              style={{ marginTop: spacing.md }}
            >
              Son inceleme: {data.last_reviewed_at.slice(0, 10)}
            </Text>
          </>
        )}
      </ScrollView>
    </Box>
  );
};
