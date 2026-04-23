import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Share,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Share2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { colors, spacing } from '../../theme';
import { MonthlyWrappedCard, useRecapStore } from '../../store/useRecapStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface NavProp {
  goBack: () => void;
}

export const MonthlyWrappedScreen = ({ navigation }: { navigation: NavProp }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<MonthlyWrappedCard>>(null);
  const { monthly, fetchMonthly, isLoading } = useRecapStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    void fetchMonthly();
  }, [fetchMonthly]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_W);
    if (idx !== currentIndex) {
      setCurrentIndex(idx);
      void Haptics.selectionAsync();
    }
  };

  const onShare = async () => {
    if (!monthly) return;
    const card = monthly.cards[currentIndex];
    await Share.share({
      title: card.title,
      message: `${card.title} — ${card.body}\n\n— MarketPulse AI`,
    });
  };

  if (isLoading && !monthly) {
    return (
      <Box flex={1} bg="#000" center>
        <ActivityIndicator color={colors.accent.premium_gold} />
      </Box>
    );
  }

  if (!monthly) {
    return (
      <Box flex={1} bg={colors.background.base} padding={spacing.lg} style={{ paddingTop: insets.top + 48 }}>
        <GuidedStateCard
          title={t('monthlyWrappedScreen.emptyTitle')}
          description={t('monthlyWrappedScreen.emptyDesc')}
          ctaLabel={t('monthlyWrappedScreen.retry')}
          onPress={() => void fetchMonthly()}
        />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="#000">
      <FlatList
        ref={listRef}
        data={monthly.cards}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        renderItem={({ item }) => <WrappedCard card={item} />}
      />

      <Box
        row
        align="center"
        justify="space-between"
        style={{
          position: 'absolute',
          top: insets.top + 4,
          left: spacing.lg,
          right: spacing.lg,
          zIndex: 10,
        }}
      >
        <Box row style={{ flex: 1, marginRight: spacing.md }}>
          {monthly.cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progress,
                {
                  backgroundColor:
                    i < currentIndex
                      ? 'rgba(255,255,255,0.7)'
                      : i === currentIndex
                        ? '#FFFFFF'
                        : 'rgba(255,255,255,0.2)',
                },
              ]}
            />
          ))}
        </Box>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.topBtn}
        >
          <X color="#FFF" size={22} />
        </Pressable>
      </Box>

      <Box
        row
        justify="center"
        align="center"
        style={{ position: 'absolute', bottom: insets.bottom + 16, left: 0, right: 0, zIndex: 10 }}
      >
        <Pressable onPress={onShare} style={styles.shareBtn}>
          <Share2 color="#FFF" size={18} style={{ marginRight: 8 }} />
          <Text color="#FFF" weight="700">
            {t('monthlyWrappedScreen.share')}
          </Text>
        </Pressable>
      </Box>
    </Box>
  );
};

const WrappedCard: React.FC<{ card: MonthlyWrappedCard }> = ({ card }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H }}>
      <LinearGradient
        colors={[card.accent_color, '#0A0B0E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Box
        flex={1}
        padding={spacing.xl}
        style={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + 110,
          justifyContent: 'center',
        }}
      >
        <Animated.View entering={FadeIn.delay(100).duration(500)}>
          <Text
            variant="caption"
            color="rgba(255,255,255,0.8)"
            weight="700"
            style={{ letterSpacing: 2, marginBottom: spacing.sm }}
          >
            {card.eyebrow.toUpperCase()}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(200).duration(700)}>
          {card.stat ? (
            <Text
              style={{
                fontSize: 72,
                fontWeight: '800',
                lineHeight: 76,
                color: '#FFF',
                letterSpacing: -2,
                marginBottom: spacing.md,
              }}
              mono
            >
              {card.stat}
            </Text>
          ) : null}
          <Text variant="h1" weight="700" color="#FFF" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -0.5 }}>
            {card.title}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(360).duration(600)}>
          <Text
            variant="body"
            color="rgba(255,255,255,0.85)"
            style={{ marginTop: spacing.lg, lineHeight: 26, fontSize: 17 }}
          >
            {card.body}
          </Text>
          {card.support_stat ? (
            <Text
              variant="caption"
              color="rgba(255,255,255,0.7)"
              style={{ marginTop: spacing.md, letterSpacing: 1.2 }}
            >
              {card.support_stat.toUpperCase()}
            </Text>
          ) : null}
        </Animated.View>
      </Box>
    </View>
  );
};

const styles = StyleSheet.create({
  progress: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
