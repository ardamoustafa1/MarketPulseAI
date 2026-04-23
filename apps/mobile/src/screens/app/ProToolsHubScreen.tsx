import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Activity,
  BellRing,
  BrainCircuit,
  FileBarChart,
  GitBranch,
  LucideIcon,
  Scale,
  Shuffle,
  Sparkles,
} from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { colors, radius, spacing } from '../../theme';

interface Tile {
  key: string;
  title: string;
  subtitle: string;
  route: string;
  Icon: LucideIcon;
  tint: string;
}

const TILES: Tile[] = [
  {
    key: 'ta',
    title: 'Teknik Analiz Paneli',
    subtitle: 'RSI · MACD · Bollinger · Fibonacci + AI yorum',
    route: 'TechnicalAnalysis',
    Icon: Activity,
    tint: '#69EFDD',
  },
  {
    key: 'formula',
    title: 'Formül Bazlı Uyarılar',
    subtitle: 'Çoklu koşul — BTC 100k + ETH/BTC 0.055',
    route: 'FormulaAlerts',
    Icon: BellRing,
    tint: '#FFB800',
  },
  {
    key: 'spread',
    title: 'Borsa Spread Dedektörü',
    subtitle: 'BtcTurk · Paribu · Binance TR — anlık fark',
    route: 'SpreadDetector',
    Icon: Shuffle,
    tint: '#7C6CFF',
  },
  {
    key: 'volcone',
    title: 'Volatilite Konisi',
    subtitle: '30 günlük gerçekleşen vs tarihsel dağılım',
    route: 'VolatilityCone',
    Icon: Scale,
    tint: '#3BD984',
  },
  {
    key: 'slicing',
    title: 'Parça Dilimleme',
    subtitle: 'Büyük pozisyonu zaman + fiyata yay',
    route: 'PositionSlicing',
    Icon: GitBranch,
    tint: '#FF8A5B',
  },
  {
    key: 'tax',
    title: 'Vergi Raporu Export',
    subtitle: 'FIFO/LIFO · CSV + PDF hazır',
    route: 'TaxReport',
    Icon: FileBarChart,
    tint: '#37A3C7',
  },
  {
    key: 'playground',
    title: 'Strateji Playground',
    subtitle: 'Kural yaz · geçmişe uygula · sonucu gör',
    route: 'StrategyPlayground',
    Icon: BrainCircuit,
    tint: '#E2A649',
  },
];

export const ProToolsHubScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Pro Araçlar"
        subtitle="Güç kullanıcı cephaneliği"
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
        <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
          <Sparkles color={colors.accent.premium_gold} size={22} />
          <Text
            variant="body"
            color={colors.text.secondary}
            style={{ marginLeft: spacing.sm, flex: 1 }}
          >
            Teknik analiz, formüllü uyarılar, arbitraj radarı ve backtest
            stüdyosu — hepsi tek hub'da.
          </Text>
        </View>

        {TILES.map((tile, i) => (
          <Animated.View
            key={tile.key}
            entering={FadeInUp.delay(i * 50).springify().damping(20)}
          >
            <Pressable
              onPress={() => navigation?.navigate(tile.route)}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.background.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border.soft,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${tile.tint}22`,
                  borderWidth: 1,
                  borderColor: `${tile.tint}55`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <tile.Icon size={22} color={tile.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="700">
                  {tile.title}
                </Text>
                <Text
                  variant="caption"
                  color={colors.text.secondary}
                  style={{ marginTop: 2 }}
                >
                  {tile.subtitle}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </Box>
  );
};
