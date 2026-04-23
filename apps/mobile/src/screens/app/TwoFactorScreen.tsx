import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Clipboard, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Clip from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react-native';
import { TextInput } from 'react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { colors, radius, spacing } from '../../theme';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

type Mode = 'status' | 'enroll' | 'disable';

interface TotpStatus {
  enabled: boolean;
  confirmed_at?: string | null;
}
interface TotpSetup {
  secret: string;
  otpauth_url: string;
}

export const TwoFactorScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [mode, setMode] = useState<Mode>('status');
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [setupData, setSetupData] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get<TotpStatus>('/api/v1/auth/2fa/status');
      setStatus(data);
    } catch {
      setStatus({ enabled: false });
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const startEnroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post<TotpSetup>('/api/v1/auth/2fa/setup');
      setSetupData(data);
      setMode('enroll');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err?.response?.data?.detail || err?.message || t('twoFactor.genericError', 'Failed to start enrolment.'));
    } finally {
      setLoading(false);
    }
  };

  const confirmEnroll = async () => {
    if (!code || code.length < 6) {
      setError(t('twoFactor.enterCode', 'Enter the 6-digit code from your authenticator app.'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/auth/2fa/verify', { code });
      Alert.alert(t('twoFactor.enabledTitle', '2FA enabled'), t('twoFactor.enabledBody', 'Two-factor authentication is now active.'));
      await refreshProfile();
      await fetchStatus();
      setSetupData(null);
      setCode('');
      setMode('status');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err?.response?.data?.detail || err?.message || t('twoFactor.verifyError', 'Invalid code. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const startDisable = () => {
    setCode('');
    setPassword('');
    setError(null);
    setMode('disable');
  };

  const confirmDisable = async () => {
    if (!password) {
      setError(t('twoFactor.enterPassword', 'Confirm your password to disable 2FA.'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/auth/2fa/disable', { password, code: code || undefined });
      await refreshProfile();
      await fetchStatus();
      setPassword('');
      setCode('');
      setMode('status');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err?.response?.data?.detail || err?.message || t('twoFactor.disableError', 'Failed to disable 2FA.'));
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!setupData?.secret) return;
    try {
      await Clip.setStringAsync(setupData.secret);
    } catch {
      try {
        (Clipboard as unknown as { setString: (v: string) => void }).setString(setupData.secret);
      } catch {
        /* noop */
      }
    }
  };

  const header = useMemo(
    () => (
      <Box row align="center" style={{ marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: spacing.md }}>
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h2" weight="700" style={{ fontSize: 24 }}>
          {t('twoFactor.title', 'Two-factor authentication')}
        </Text>
      </Box>
    ),
    [navigation, t],
  );

  return (
    <Box flex={1} bg={colors.background.base}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        {header}

        {mode === 'status' && (
          <PremiumCard style={styles.card}>
            <Box row align="center" style={{ marginBottom: spacing.sm }}>
              {status?.enabled ? (
                <ShieldCheck color={colors.sentiment.bull_green} size={22} />
              ) : (
                <ShieldOff color={colors.text.muted} size={22} />
              )}
              <Text variant="h3" weight="700" style={{ marginLeft: 8 }}>
                {status?.enabled
                  ? t('twoFactor.statusEnabled', 'Enabled')
                  : t('twoFactor.statusDisabled', 'Not enabled')}
              </Text>
            </Box>
            <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 20, marginBottom: spacing.md }}>
              {t(
                'twoFactor.description',
                'Add a second layer by linking an authenticator app (Google Authenticator, 1Password, Authy). You will be asked for a 6-digit code each time you sign in.',
              )}
            </Text>

            {status?.enabled ? (
              <Pressable onPress={startDisable} style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.8 }]}>
                <Text color="#fff" weight="700">
                  {t('twoFactor.disableCta', 'Disable 2FA')}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={startEnroll}
                disabled={loading}
                style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }, loading && { opacity: 0.5 }]}
              >
                <Text color="#141622" weight="700">
                  {loading ? t('common.loading', 'Loading…') : t('twoFactor.enableCta', 'Enable 2FA')}
                </Text>
              </Pressable>
            )}
          </PremiumCard>
        )}

        {mode === 'enroll' && setupData && (
          <PremiumCard style={styles.card}>
            <Box row align="center" style={{ marginBottom: spacing.md }}>
              <KeyRound color={colors.accent.premium_gold} size={22} />
              <Text variant="h3" weight="700" style={{ marginLeft: 8 }}>
                {t('twoFactor.enrollTitle', 'Add to your authenticator')}
              </Text>
            </Box>

            <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 20, marginBottom: spacing.md }}>
              {t(
                'twoFactor.enrollBody',
                'Open your authenticator app and add a new account. Enter the secret below or scan the QR code from your browser.',
              )}
            </Text>

            <Box style={styles.secretBox}>
              <Text variant="caption" color={colors.text.muted} style={{ marginBottom: 4 }}>
                {t('twoFactor.secret', 'Secret')}
              </Text>
              <Box row align="center" justify="space-between">
                <Text variant="body" weight="700" mono style={{ letterSpacing: 1 }}>
                  {setupData.secret}
                </Text>
                <Pressable onPress={copySecret} hitSlop={10}>
                  <Copy color={colors.text.primary} size={18} />
                </Pressable>
              </Box>
              <Text variant="caption" color={colors.text.muted} style={{ marginTop: spacing.sm }} numberOfLines={1}>
                {setupData.otpauth_url}
              </Text>
            </Box>

            <LabeledField label={t('twoFactor.codeLabel', 'Verification code')}>
              <TextInput
                placeholder="123456"
                placeholderTextColor={colors.text.muted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={8}
                autoComplete="one-time-code"
                style={styles.textInput}
              />
            </LabeledField>

            <Pressable
              onPress={confirmEnroll}
              disabled={loading}
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }, loading && { opacity: 0.5 }]}
            >
              <Text color="#141622" weight="700">
                {loading ? t('common.loading', 'Loading…') : t('twoFactor.verifyCta', 'Verify & enable')}
              </Text>
            </Pressable>

            <Pressable onPress={() => setMode('status')} style={{ marginTop: spacing.sm }}>
              <Text align="center" variant="caption" weight="600" color={colors.text.muted}>
                {t('common.cancel', 'Cancel')}
              </Text>
            </Pressable>
          </PremiumCard>
        )}

        {mode === 'disable' && (
          <PremiumCard style={styles.card}>
            <Box row align="center" style={{ marginBottom: spacing.md }}>
              <ShieldOff color={colors.sentiment.bear_red} size={22} />
              <Text variant="h3" weight="700" style={{ marginLeft: 8 }}>
                {t('twoFactor.disableTitle', 'Disable 2FA')}
              </Text>
            </Box>
            <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 20, marginBottom: spacing.md }}>
              {t(
                'twoFactor.disableBody',
                'Confirm your password and a current TOTP code to remove two-factor authentication.',
              )}
            </Text>

            <LabeledField label={t('twoFactor.passwordLabel', 'Current password')}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={colors.text.muted}
                style={styles.textInput}
              />
            </LabeledField>
            <LabeledField label={t('twoFactor.codeLabel', 'Verification code')}>
              <TextInput
                placeholder="123456"
                placeholderTextColor={colors.text.muted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={8}
                style={styles.textInput}
              />
            </LabeledField>

            <Pressable
              onPress={confirmDisable}
              disabled={loading}
              style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.8 }, loading && { opacity: 0.5 }]}
            >
              <Text color="#fff" weight="700">
                {loading ? t('common.loading', 'Loading…') : t('twoFactor.disableConfirmCta', 'Disable')}
              </Text>
            </Pressable>
            <Pressable onPress={() => setMode('status')} style={{ marginTop: spacing.sm }}>
              <Text align="center" variant="caption" weight="600" color={colors.text.muted}>
                {t('common.cancel', 'Cancel')}
              </Text>
            </Pressable>
          </PremiumCard>
        )}

        {error ? (
          <Box style={[styles.errorBox]}>
            <Text variant="caption" color={colors.sentiment.bear_red}>
              {error}
            </Text>
          </Box>
        ) : null}
      </ScrollView>
    </Box>
  );
};

const LabeledField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box style={{ marginTop: spacing.md }}>
    <Text variant="caption" color={colors.text.muted} style={{ marginBottom: 6 }}>
      {label}
    </Text>
    <Box style={styles.inputWrap}>{children}</Box>
  </Box>
);

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  textInput: {
    color: colors.text.primary,
    fontSize: 16,
    minHeight: 24,
    padding: 0,
    margin: 0,
  },
  primaryButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.accent.premium_gold,
    borderRadius: radius.lg,
  },
  dangerButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.sentiment.bear_red,
    borderRadius: radius.lg,
  },
  secretBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,92,92,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,92,92,0.25)',
  },
});
