import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Linking, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { GoldPulse } from '../../components/onboarding/GoldPulse';
import { CandleAnimation } from '../../components/onboarding/CandleAnimation';
import { colors, radius, spacing } from '../../theme';
import { ArrowRight, Bell, Check, LineChart, ShieldCheck, Sparkles } from 'lucide-react-native';

const CONSENT_STORAGE_KEY = 'user_consent_acceptance_v1';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'hero',
    accent: 'hero' as const,
    headlineKey: 'onboarding.slide1.headline',
    bodyKey: 'onboarding.slide1.body',
  },
  {
    key: 'signals',
    accent: 'candles' as const,
    headlineKey: 'onboarding.slide2.headline',
    bodyKey: 'onboarding.slide2.body',
  },
  {
    key: 'insights',
    accent: 'alerts' as const,
    headlineKey: 'onboarding.slide3.headline',
    bodyKey: 'onboarding.slide3.body',
  },
  {
    key: 'consent',
    accent: 'consent' as const,
    headlineKey: 'onboarding.consent.headline',
    bodyKey: 'onboarding.consent.body',
  },
];

export const OnboardingScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const extra = (Constants.expoConfig?.extra || {}) as {
    privacyPolicyUrl?: string;
    termsUrl?: string;
  };

  const consentReady = acceptedTerms && acceptedPrivacy && acceptedDisclaimer;
  const isConsentSlide = activeIdx === SLIDES.length - 1;

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== activeIdx) {
      setActiveIdx(next);
      if (Platform.OS !== 'web') Haptics.selectionAsync();
    }
  }, [activeIdx]);

  const persistConsent = useCallback(async () => {
    try {
      const payload = JSON.stringify({
        terms: true,
        privacy: true,
        disclaimer: true,
        acceptedAt: new Date().toISOString(),
        termsUrl: extra.termsUrl ?? null,
        privacyUrl: extra.privacyPolicyUrl ?? null,
      });
      await SecureStore.setItemAsync(CONSENT_STORAGE_KEY, payload);
    } catch {
      /* non-blocking */
    }
  }, [extra.privacyPolicyUrl, extra.termsUrl]);

  const goNext = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isConsentSlide) {
      if (!consentReady) return;
      void persistConsent().then(() => navigation.navigate('Register'));
      return;
    }
    if (activeIdx < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIdx + 1) * width, animated: true });
    }
  }, [activeIdx, consentReady, isConsentSlide, navigation, persistConsent]);

  const goLogin = () => navigation.navigate('Login');

  const openLink = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  const trackingValues = useMemo(
    () => SLIDES.map((_, i) => (i === activeIdx ? 1 : 0)),
    [activeIdx]
  );

  return (
    <Box flex={1} bg={colors.background.base}>
      <LinearGradient
        colors={['rgba(200,169,126,0.12)', 'transparent']}
        style={StyleSheet.absoluteFillObject as any}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      <Animated.View entering={FadeIn.duration(500)} style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg }}>
        <Box row justify="space-between" align="center">
          <Box row align="center">
            <Sparkles color={colors.accent.premium_gold} size={20} style={{ marginRight: 6 }} />
            <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>
              MarketPulse
            </Text>
          </Box>
          {!isConsentSlide ? (
            <Pressable
              onPress={() => scrollRef.current?.scrollTo({ x: (SLIDES.length - 1) * width, animated: true })}
              hitSlop={10}
            >
              <Text variant="caption" weight="700" color={colors.text.secondary}>
                {t('onboarding.skip', 'Atla')}
              </Text>
            </Pressable>
          ) : (
            <Box />
          )}
        </Box>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, _idx) => (
          <View key={slide.key} style={{ width, flex: 1 }}>
            {slide.accent === 'consent' ? (
              <Box flex={1} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
                <Box center style={{ height: 160, justifyContent: 'center', marginTop: spacing.lg }}>
                  <ShieldCheck color={colors.accent.premium_gold} size={64} />
                </Box>
                <Animated.View entering={FadeInUp.duration(500).delay(180)} style={{ width: '100%', marginTop: spacing.lg }}>
                  <Text variant="h1" align="center" style={{ fontSize: 28, letterSpacing: -1, marginBottom: spacing.sm }}>
                    {t(slide.headlineKey, 'Güvenliğiniz önceliğimiz')}
                  </Text>
                  <Text variant="body" color={colors.text.secondary} align="center" style={{ paddingHorizontal: spacing.md, lineHeight: 22, fontSize: 14, marginBottom: spacing.lg }}>
                    {t(slide.bodyKey, 'Devam etmeden önce kullanım şartlarını ve gizlilik politikasını inceleyin.')}
                  </Text>
                  <ConsentRow
                    checked={acceptedTerms}
                    onToggle={() => setAcceptedTerms((v) => !v)}
                    label={t('onboarding.consent.terms', 'Kullanım Şartlarını okudum ve kabul ediyorum')}
                    linkLabel={t('onboarding.consent.termsLink', 'Şartları görüntüle')}
                    onLink={() => openLink(extra.termsUrl)}
                  />
                  <ConsentRow
                    checked={acceptedPrivacy}
                    onToggle={() => setAcceptedPrivacy((v) => !v)}
                    label={t('onboarding.consent.privacy', 'KVKK/GDPR Aydınlatma Metnini kabul ediyorum')}
                    linkLabel={t('onboarding.consent.privacyLink', 'Politikayı görüntüle')}
                    onLink={() => openLink(extra.privacyPolicyUrl)}
                  />
                  <ConsentRow
                    checked={acceptedDisclaimer}
                    onToggle={() => setAcceptedDisclaimer((v) => !v)}
                    label={t(
                      'onboarding.consent.disclaimer',
                      'Bu uygulama yatırım tavsiyesi vermez. Fiyatlar bilgilendirme amaçlıdır.',
                    )}
                  />
                </Animated.View>
              </Box>
            ) : (
              <Box flex={1} align="center" justify="center" style={{ paddingHorizontal: spacing.lg }}>
                <Box center style={{ height: 300, justifyContent: 'center' }}>
                  {slide.accent === 'hero' && <GoldPulse />}
                  {slide.accent === 'candles' && (
                    <Box align="center">
                      <CandleAnimation />
                      <Box center style={styles.iconBadge}>
                        <LineChart color={colors.accent.primary_blue} size={20} />
                      </Box>
                    </Box>
                  )}
                  {slide.accent === 'alerts' && (
                    <Box align="center">
                      <GoldPulse />
                      <Box center style={[styles.iconBadge, { top: 16 }]}>
                        <Bell color={colors.sentiment.bull_green} size={20} />
                      </Box>
                    </Box>
                  )}
                </Box>

                <Animated.View entering={FadeInUp.duration(500).delay(180)} style={{ width: '100%', marginTop: spacing.xl }}>
                  <Text variant="h1" align="center" style={{ fontSize: 32, letterSpacing: -1.2, marginBottom: spacing.sm }}>
                    {t(slide.headlineKey)}
                  </Text>
                  <Text
                    variant="body"
                    color={colors.text.secondary}
                    align="center"
                    style={{ paddingHorizontal: spacing.md, lineHeight: 24, fontSize: 15 }}
                  >
                    {t(slide.bodyKey)}
                  </Text>
                </Animated.View>
              </Box>
            )}
          </View>
        ))}
      </ScrollView>

      <Box align="center" style={{ paddingBottom: spacing.md }}>
        <Box row style={{ gap: 6 }}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                trackingValues[i] === 1 && styles.dotActive,
              ]}
            />
          ))}
        </Box>
      </Box>

      <BlurView intensity={30} tint="dark" style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={goNext}
          disabled={isConsentSlide && !consentReady}
          style={({ pressed }) => [{ opacity: isConsentSlide && !consentReady ? 0.55 : pressed ? 0.9 : 1 }]}
        >
          <LinearGradient
            colors={['#E9C893', '#C8A97E', '#8A6A3E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text variant="h3" weight="700" color="#141622">
              {isConsentSlide ? t('onboarding.consent.cta', 'Kabul Et ve Devam Et') : t('onboarding.next', 'Devam et')}
            </Text>
            <ArrowRight color="#141622" size={18} style={{ marginLeft: 8 }} />
          </LinearGradient>
        </Pressable>

        <Pressable onPress={goLogin} style={{ marginTop: spacing.sm }}>
          <Box center padding={spacing.md} radius={radius.pill} style={styles.secondaryButton}>
            <Text variant="body" weight="600" color={colors.text.primary}>
              {t('onboarding.loginCta', 'Hesabım var, giriş yap')}
            </Text>
          </Box>
        </Pressable>
      </BlurView>
    </Box>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: radius.pill,
    shadowColor: '#C8A97E',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBadge: {
    position: 'absolute',
    top: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,14,18,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent.premium_gold,
  },
});

interface ConsentRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  linkLabel?: string;
  onLink?: () => void;
}

const ConsentRow: React.FC<ConsentRowProps> = ({ checked, onToggle, label, linkLabel, onLink }) => (
  <Pressable
    onPress={() => {
      if (Platform.OS !== 'web') Haptics.selectionAsync();
      onToggle();
    }}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginBottom: spacing.sm }]}
  >
    <Box
      row
      align="center"
      style={{
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: checked ? 'rgba(200,169,126,0.4)' : 'rgba(255,255,255,0.08)',
        backgroundColor: checked ? 'rgba(200,169,126,0.08)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <Box
        center
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: checked ? colors.accent.premium_gold : 'rgba(255,255,255,0.2)',
          backgroundColor: checked ? colors.accent.premium_gold : 'transparent',
          marginRight: spacing.md,
        }}
      >
        {checked && <Check color="#141622" size={14} />}
      </Box>
      <Box flex={1}>
        <Text variant="caption" color={colors.text.primary} style={{ lineHeight: 18 }}>
          {label}
        </Text>
        {linkLabel && onLink ? (
          <Pressable onPress={onLink} hitSlop={6}>
            <Text variant="caption" weight="700" color={colors.accent.primary_blue} style={{ marginTop: 2 }}>
              {linkLabel}
            </Text>
          </Pressable>
        ) : null}
      </Box>
    </Box>
  </Pressable>
);

export { ONBOARDING_STEPS } from './onboardingSteps';
