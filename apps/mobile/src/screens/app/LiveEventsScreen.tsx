import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Radio } from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { fetchLiveEvents } from '../../api/social';
import type { LiveEvent } from '../../types/social';
import { colors, radius, spacing } from '../../theme';

const KIND_LABEL: Record<string, string> = {
  live_stream: 'Canlı Yayın',
  market_open: 'Piyasa Açılışı',
  market_close: 'Piyasa Kapanışı',
  fed_decision: 'FED Kararı',
  tcmb_decision: 'TCMB Kararı',
  ceremony: 'Seremoni',
};

const formatCountdown = (seconds: number): string => {
  if (seconds <= 0) return 'Şimdi başlıyor';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${minutes}dk`;
  return `${minutes}dk`;
};

export const LiveEventsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLiveEvents(12);
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Canlı Yayınlar"
        subtitle="Çarşamba 21:00 analist maratonu"
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
        {loading && events.length === 0 && (
          <ActivityIndicator color={colors.accent.premium_gold} />
        )}
        {events.map((ev, i) => (
          <Animated.View
            key={ev.id}
            entering={FadeInUp.delay(i * 50).springify().damping(20)}
          >
            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
              }}
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
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: `${colors.sentiment.bear_red}22`,
                    borderWidth: 1,
                    borderColor: `${colors.sentiment.bear_red}55`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Radio color={colors.sentiment.bear_red} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="700" numberOfLines={1}>
                    {ev.title}
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    numberOfLines={1}
                    style={{ marginTop: 2 }}
                  >
                    {KIND_LABEL[ev.kind] ?? ev.kind}
                    {ev.asset_class ? ` · ${ev.asset_class.replace('_', ' ')}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: colors.background.elevated,
                    borderWidth: 1,
                    borderColor: colors.border.soft,
                  }}
                >
                  <Text variant="caption" weight="700" color={colors.text.primary}>
                    {formatCountdown(ev.starts_in_seconds)}
                  </Text>
                </View>
              </View>
              {ev.description && (
                <Text
                  variant="caption"
                  color={colors.text.muted}
                  style={{ marginTop: spacing.sm }}
                >
                  {ev.description}
                </Text>
              )}
              <Text
                variant="caption"
                color={colors.text.muted}
                style={{ marginTop: spacing.xs }}
              >
                {new Date(ev.scheduled_at).toLocaleString('tr-TR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                {ev.host_display_name ? ` · ${ev.host_display_name}` : ''}
                {ev.duration_minutes ? ` · ${ev.duration_minutes} dk` : ''}
              </Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </Box>
  );
};
