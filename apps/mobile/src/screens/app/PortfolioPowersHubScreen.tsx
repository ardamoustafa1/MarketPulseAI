import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Activity,
  ArrowLeftRight,
  CircleDollarSign,
  Coins,
  Flame,
  LineChart,
  LucideIcon,
  ReceiptText,
  Target,
  Users,
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
    key: 'denom',
    title: 'Çoklu Denominasyon',
    subtitle: 'Portföyünü TRY / USD / BTC / ALTIN-gram cinsinden gör',
    route: 'PortfolioDenomination',
    Icon: CircleDollarSign,
    tint: '#C8A97E',
  },
  {
    key: 'rebalance',
    title: 'Akıllı Rebalancer',
    subtitle: 'Hedef ağırlıklar ve tek-tuşla dengeleme planı',
    route: 'PortfolioRebalancer',
    Icon: ArrowLeftRight,
    tint: '#4A5C82',
  },
  {
    key: 'dca',
    title: 'DCA Simülatörü',
    subtitle: '“Son 3 yılda her ay 1.000₺ koysaydın…”',
    route: 'PortfolioDcaSimulator',
    Icon: LineChart,
    tint: '#3BD984',
  },
  {
    key: 'paper',
    title: 'Sanal Emir (Paper)',
    subtitle: 'Stop-loss · take-profit · OCO · stop-limit',
    route: 'PaperOrders',
    Icon: Activity,
    tint: '#7B6CC9',
  },
  {
    key: 'tax',
    title: 'Vergi Lot Takibi',
    subtitle: 'FIFO / LIFO — açık lotlar ve realize kar-zarar',
    route: 'PortfolioTaxLots',
    Icon: ReceiptText,
    tint: '#E2A649',
  },
  {
    key: 'goals',
    title: 'Çok-Varlıklı Hedef',
    subtitle: 'Ör. 50 çeyrek + 1 BTC + 10k USD',
    route: 'PortfolioMultiGoals',
    Icon: Target,
    tint: '#37A3C7',
  },
  {
    key: 'shared',
    title: 'Aile / Ortak Portföy',
    subtitle: 'Davet, şeffaf geçmiş, rol tabanlı erişim',
    route: 'PortfolioShared',
    Icon: Users,
    tint: '#E874A6',
  },
  {
    key: 'stress',
    title: 'Stres Testi',
    subtitle: '2008 / 2020 / 2022 senaryoları bugün patlasa ne olurdu?',
    route: 'PortfolioStressTest',
    Icon: Flame,
    tint: '#FF5C5C',
  },
];

export const PortfolioPowersHubScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Portföy Süper Güçleri"
        subtitle="Rakiplerde olmayan pro araçlar"
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
          <Coins color={colors.accent.premium_gold} size={22} />
          <Text
            variant="body"
            color={colors.text.secondary}
            style={{ marginLeft: spacing.sm, flex: 1 }}
          >
            Portföyünü her varlıkta çalışan sekiz süper güçle yönet. Hepsi gerçek verilerle
            çalışır; AI desteği ile tempolu ve kaygı-giderici.
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
