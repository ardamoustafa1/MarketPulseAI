import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { Skeleton } from '../../components/ui/Skeleton';
import { colors, spacing, radius } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { formatCurrency } from '../../utils/formatters';
import { registerPushTokenWithBackend, unregisterPushFromBackend } from '../../services/pushRegistration';
import { apiClient } from '../../api/client';
import { setAppLanguage } from '../../i18n';

const BIO_LOCK_KEY = 'biometric_app_lock_enabled';
const PUSH_PREF_KEY = 'push_notifications_pref';

function formatMemberSince(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
}

function shortId(id: string | undefined): string {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export const ProfileScreen = ({ navigation }: { navigation: { navigate: (name: string) => void } }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { user, logout, refreshProfile, isLoading: authLoading } = useAuthStore();
  const {
    favorites,
    fetchWatchlist,
    isLoading: watchlistLoading,
    error: watchlistError,
    clearError: clearWatchlistError,
  } = useWatchlistStore();
  const {
    summary,
    positions,
    fetchPortfolio,
    isLoading: portfolioLoading,
    error: portfolioError,
    clearError: clearPortfolioError,
    activePortfolioId,
  } = usePortfolioStore();
  const { isConnected: wsConnected, lastUpdatedAt, initializeRealtime } = useMarketDataStore();

  const [refreshing, setRefreshing] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [pushOn, setPushOn] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const b = await SecureStore.getItemAsync(BIO_LOCK_KEY);
        const p = await SecureStore.getItemAsync(PUSH_PREF_KEY);
        setBiometricOn(b === 'true');
        setPushOn(p !== 'false');
      })();
    }, [])
  );

  const loadAll = useCallback(async () => {
    await Promise.all([refreshProfile(), fetchWatchlist(), fetchPortfolio()]);
  }, [fetchPortfolio, fetchWatchlist, refreshProfile]);

  const exportTransactionsCsv = useCallback(async () => {
    try {
      if (!cacheDirectory) {
        Alert.alert('Export unavailable', 'File system is not available in this environment.');
        return;
      }
      const res = await apiClient.get('/api/v1/transactions/export/csv', {
        responseType: 'text',
        params: activePortfolioId ? { portfolio_id: activePortfolioId } : {},
      });
      const text = typeof res.data === 'string' ? res.data : String(res.data);
      const path = `${cacheDirectory}marketpulse-transactions.csv`;
      await writeAsStringAsync(path, text);
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: t('common:exportCsv') });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Could not export CSV.');
    }
  }, [activePortfolioId, t]);

  useFocusEffect(
    useCallback(() => {
      initializeRealtime();
      void loadAll();
    }, [initializeRealtime, loadAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const favoriteCount = useMemo(() => Object.keys(favorites).length, [favorites]);

  const displayName = useMemo(() => {
    const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }
    return user?.email ?? 'User';
  }, [user]);

  const initials = useMemo(() => {
    const source = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.email || 'U';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }, [user]);

  const isSyncing = watchlistLoading || portfolioLoading;
  const feedLabel = wsConnected ? 'Connected' : 'Disconnected';
  const feedColor = wsConnected ? colors.sentiment.bull_green : colors.sentiment.bear_red;
  const lastFeedText = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const mergedError = watchlistError ?? portfolioError;

  if (authLoading && !user) {
    return (
      <Box flex={1} bg={colors.background.base} padding={spacing.lg} style={{ paddingTop: insets.top + spacing.lg }}>
        <Skeleton height={28} width={140} style={{ marginBottom: spacing.lg }} />
        <Skeleton height={88} width="100%" style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
        <Skeleton height={160} width="100%" style={{ borderRadius: radius.lg }} />
      </Box>
    );
  }

  return (
    <Box flex={1} bg={colors.background.base}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.premium_gold} />
        }
      >
        <Text variant="h2" style={{ marginBottom: spacing.xs }} accessibilityRole="header">
          Profile
        </Text>
        <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.lg }}>
          {user?.subscription_tier === 'pro' ? t('common:planPro') : t('common:planFree')}
        </Text>

        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          style={{ marginBottom: spacing.lg }}
        >
          <Box
            row
            align="center"
            justify="space-between"
            style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Text variant="body" weight="600">
              Edit name &amp; password
            </Text>
            <ChevronRight color={colors.text.muted} size={20} />
          </Box>
        </Pressable>

        <Box style={{ marginBottom: spacing.md }}>
          <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.sm }}>
            DATA &amp; TAX
          </Text>
          <Pressable onPress={exportTransactionsCsv} style={{ marginBottom: spacing.sm }}>
            <Box
              row
              align="center"
              justify="space-between"
              style={{
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: colors.background.surface,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text variant="body" weight="600">
                {t('common:exportCsv')}
              </Text>
              <ChevronRight color={colors.text.muted} size={20} />
            </Box>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('FifoSummary')} style={{ marginBottom: spacing.sm }}>
            <Box
              row
              align="center"
              justify="space-between"
              style={{
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: colors.background.surface,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text variant="body" weight="600">
                {t('common:fifoSummary')}
              </Text>
              <ChevronRight color={colors.text.muted} size={20} />
            </Box>
          </Pressable>
          <Box
            row
            align="center"
            justify="space-between"
            style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Text variant="body" weight="600">
              {t('common:language')}
            </Text>
            <Box row>
              <Pressable onPress={() => setAppLanguage('en')} style={{ marginRight: spacing.md }}>
                <Text variant="caption" weight={i18n.language.startsWith('en') ? '700' : '500'} color={colors.text.primary}>
                  EN
                </Text>
              </Pressable>
              <Pressable onPress={() => setAppLanguage('tr')}>
                <Text variant="caption" weight={i18n.language.startsWith('tr') ? '700' : '500'} color={colors.text.primary}>
                  TR
                </Text>
              </Pressable>
            </Box>
          </Box>
        </Box>

        <Box
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: spacing.md,
          }}
        >
          <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.md }}>
            SECURITY
          </Text>
          <Box row align="center" justify="space-between" style={{ marginBottom: spacing.sm }}>
            <Box flex={1} style={{ paddingRight: spacing.md }}>
              <Text variant="body" weight="600">
                Face ID / Touch ID lock
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                Ask for biometrics when opening the app
              </Text>
            </Box>
            <Switch
              value={biometricOn}
              onValueChange={async (next) => {
                if (next) {
                  const has = await LocalAuthentication.hasHardwareAsync();
                  const enrolled = await LocalAuthentication.isEnrolledAsync();
                  if (!has || !enrolled) {
                    return;
                  }
                  const r = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Enable app lock',
                  });
                  if (!r.success) return;
                  await SecureStore.setItemAsync(BIO_LOCK_KEY, 'true');
                  setBiometricOn(true);
                } else {
                  await SecureStore.deleteItemAsync(BIO_LOCK_KEY);
                  setBiometricOn(false);
                }
              }}
              trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.sentiment.bull_green }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : undefined}
            />
          </Box>
          <Box row align="center" justify="space-between">
            <Box flex={1} style={{ paddingRight: spacing.md }}>
              <Text variant="body" weight="600">
                Price alert push notifications
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                Notify when a price alert triggers (Expo push)
              </Text>
            </Box>
            <Switch
              value={pushOn}
              onValueChange={async (next) => {
                setPushOn(next);
                if (next) {
                  await SecureStore.setItemAsync(PUSH_PREF_KEY, 'true');
                  await registerPushTokenWithBackend();
                } else {
                  await SecureStore.setItemAsync(PUSH_PREF_KEY, 'false');
                  await unregisterPushFromBackend();
                }
              }}
              trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.sentiment.bull_green }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : undefined}
            />
          </Box>
        </Box>

        {mergedError ? (
          <Pressable
            onPress={() => {
              clearWatchlistError();
              clearPortfolioError();
            }}
            style={{ marginBottom: spacing.md }}
          >
            <Box
              style={{
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: 'rgba(255,92,92,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255,92,92,0.25)',
              }}
            >
              <Text variant="caption" color={colors.sentiment.bear_red}>
                {mergedError} · Tap to dismiss
              </Text>
            </Box>
          </Pressable>
        ) : null}

        <Box
          row
          align="center"
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: spacing.md,
          }}
        >
          <Box
            center
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(200,169,126,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(200,169,126,0.35)',
              marginRight: spacing.md,
            }}
          >
            <Text variant="h2" weight="700">
              {initials || 'U'}
            </Text>
          </Box>
          <Box flex={1}>
            <Text variant="h3" weight="700">
              {displayName}
            </Text>
            <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 4 }}>
              {user?.email ?? '—'}
            </Text>
            <Text variant="caption" color={colors.text.muted} style={{ marginTop: 6 }}>
              Account ID {shortId(user?.id)}
            </Text>
          </Box>
        </Box>

        <Box
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: spacing.md,
          }}
        >
          <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.sm }}>
            ACCOUNT
          </Text>
          <Box row justify="space-between" style={{ marginBottom: spacing.sm }}>
            <Text variant="body" color={colors.text.secondary}>
              Role
            </Text>
            <Text variant="body" weight="600">
              {user?.role ?? '—'}
            </Text>
          </Box>
          <Box row justify="space-between" style={{ marginBottom: spacing.sm }}>
            <Text variant="body" color={colors.text.secondary}>
              Status
            </Text>
            <Text
              variant="body"
              weight="600"
              color={user?.is_active !== false ? colors.sentiment.bull_green : colors.sentiment.bear_red}
            >
              {user?.is_active !== false ? 'Active' : 'Inactive'}
            </Text>
          </Box>
          <Box row justify="space-between">
            <Text variant="body" color={colors.text.secondary}>
              Member since
            </Text>
            <Text variant="body" weight="600">
              {formatMemberSince(user?.created_at)}
            </Text>
          </Box>
        </Box>

        <Box
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: spacing.md,
          }}
        >
          <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.sm }}>
            PORTFOLIO
          </Text>
          {isSyncing && !summary ? (
            <Skeleton height={20} width="70%" style={{ marginBottom: spacing.sm }} />
          ) : (
            <>
              <Box row justify="space-between" style={{ marginBottom: spacing.sm }}>
                <Text variant="body" color={colors.text.secondary}>
                  Total value
                </Text>
                <Text variant="body" weight="700">
                  {summary ? formatCurrency(summary.totalValue) : '—'}
                </Text>
              </Box>
              <Box row justify="space-between" style={{ marginBottom: spacing.sm }}>
                <Text variant="body" color={colors.text.secondary}>
                  Invested
                </Text>
                <Text variant="body" weight="600">
                  {summary ? formatCurrency(summary.totalInvested) : '—'}
                </Text>
              </Box>
              <Box row justify="space-between" style={{ marginBottom: spacing.sm }}>
                <Text variant="body" color={colors.text.secondary}>
                  Unrealized P&amp;L
                </Text>
                <Text
                  variant="body"
                  weight="700"
                  color={
                    summary && parseFloat(summary.unrealizedPnl) >= 0
                      ? colors.sentiment.bull_green
                      : colors.sentiment.bear_red
                  }
                >
                  {summary ? formatCurrency(summary.unrealizedPnl) : '—'}
                </Text>
              </Box>
              <Box row justify="space-between" style={{ marginBottom: spacing.sm }}>
                <Text variant="body" color={colors.text.secondary}>
                  Positions
                </Text>
                <Text variant="body" weight="600">
                  {positions.length}
                </Text>
              </Box>
              <Box row justify="space-between">
                <Text variant="body" color={colors.text.secondary}>
                  Valuation
                </Text>
                <Text
                  variant="body"
                  weight="600"
                  color={summary?.valuationComplete ? colors.sentiment.bull_green : colors.text.secondary}
                >
                  {summary?.valuationComplete ? 'Complete' : 'Partial'}
                  {summary && summary.stalePricePositions ? ` · ${summary.stalePricePositions} stale` : ''}
                  {summary && summary.missingPricePositions ? ` · ${summary.missingPricePositions} missing price` : ''}
                </Text>
              </Box>
            </>
          )}
        </Box>

        <Box
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: spacing.md,
          }}
        >
          <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.sm }}>
            WATCHLIST
          </Text>
          <Box row justify="space-between" style={{ marginBottom: spacing.xs }}>
            <Text variant="body" color={colors.text.secondary}>
              Saved symbols
            </Text>
            <Text variant="body" weight="700">
              {favoriteCount}
            </Text>
          </Box>
          <Text variant="caption" color={colors.text.muted}>
            Favorites sync with the server when you are logged in.
          </Text>
        </Box>

        <Box
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: spacing.lg,
          }}
        >
          <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.sm }}>
            LIVE DATA
          </Text>
          <Box row justify="space-between" style={{ marginBottom: spacing.xs }}>
            <Text variant="body" color={colors.text.secondary}>
              WebSocket
            </Text>
            <Text variant="body" weight="700" color={feedColor}>
              {feedLabel}
            </Text>
          </Box>
          <Box row justify="space-between" style={{ marginBottom: spacing.xs }}>
            <Text variant="body" color={colors.text.secondary}>
              Last quote update
            </Text>
            <Text variant="body" weight="600">
              {lastFeedText}
            </Text>
          </Box>
          <Box row justify="space-between" align="center">
            <Text variant="body" color={colors.text.secondary}>
              Account data
            </Text>
            <Text variant="body" weight="600" color={isSyncing ? colors.text.secondary : colors.sentiment.bull_green}>
              {isSyncing ? 'Syncing…' : 'Up to date'}
            </Text>
          </Box>
        </Box>

        <Pressable onPress={logout}>
          <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} center>
            <Text color={colors.sentiment.bear_red} weight="700">
              Log out
            </Text>
          </Box>
        </Pressable>
      </ScrollView>
    </Box>
  );
};
