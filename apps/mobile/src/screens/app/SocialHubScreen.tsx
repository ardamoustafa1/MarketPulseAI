import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Image as ImageIcon,
  LucideIcon,
  Radio,
  Share2,
  Sparkles,
  Trophy,
  Users,
  UsersRound,
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
    key: 'share',
    title: 'Paylaşılabilir Kart',
    subtitle: 'Compare / Wrapped / karar / streak — story formatında',
    route: 'ShareCardStudio',
    Icon: ImageIcon,
    tint: '#FFB800',
  },
  {
    key: 'lists',
    title: 'Topluluk Listeleri',
    subtitle: 'AI Sepeti · Emekli Dostu · TR Hisse + Altın · Meme Arena',
    route: 'CommunityLists',
    Icon: UsersRound,
    tint: '#7C6CFF',
  },
  {
    key: 'copy',
    title: 'Copy-Strategy',
    subtitle: 'Sanal olarak takip et — tamamen eğitim amaçlı',
    route: 'CopyStrategy',
    Icon: Share2,
    tint: '#37A3C7',
  },
  {
    key: 'leaderboard',
    title: 'Lider Tablosu',
    subtitle: '4 haftalık sezon · Kripto / Altın / Hisse ligleri',
    route: 'Leaderboard',
    Icon: Trophy,
    tint: '#E2A649',
  },
  {
    key: 'referral',
    title: 'Arkadaş Davet Et',
    subtitle: '0.1 gr gümüş puan · 1 USDT puan · çeyrek altın puan',
    route: 'Referral',
    Icon: Users,
    tint: '#3BD984',
  },
  {
    key: 'live',
    title: 'Canlı Yayınlar',
    subtitle: 'Çarşamba 21:00 · metal / kripto / FX rotasyonu',
    route: 'LiveEvents',
    Icon: Radio,
    tint: '#FF5C5C',
  },
];

export const SocialHubScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Sosyal & Topluluk"
        subtitle="Viralite, lig ve paylaşım"
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
            Tek dokunuşla listeni paylaş, ligde yer al, sanal strateji kopyala ve
            arkadaşını davet et.
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
