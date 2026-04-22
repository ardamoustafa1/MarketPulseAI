import React from 'react';
import { ActivityIndicator, Pressable, TextInput } from 'react-native';
import type { AxiosError } from 'axios';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../api/client';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuthStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = isEmailValid && password.length >= 8 && !isSubmitting;

  const formatLoginError = (loginError: unknown): string => {
    const axiosError = loginError as AxiosError<{ detail?: unknown }>;
    const detail = axiosError.response?.data?.detail;

    if (axiosError.response?.status === 422) {
      if (Array.isArray(detail) && detail.length > 0) {
        const firstIssue = detail[0] as { msg?: string; loc?: Array<string | number> };
        const fieldName = typeof firstIssue?.loc?.[1] === 'string' ? firstIssue.loc[1] : 'field';
        if (firstIssue?.msg) {
          return `${fieldName}: ${firstIssue.msg}`;
        }
      }
      return 'Please use a valid email and a password with at least 8 characters.';
    }

    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }

    if (axiosError.response?.status === 401) {
      return 'Email veya sifre hatali. Sifreni kontrol edip tekrar dene.';
    }

    return axiosError.message || 'Giris basarisiz. Baglantini kontrol edip yeniden dene.';
  };

  const handleLogin = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/api/v1/auth/login', {
        email: email.trim(),
        password,
      });

      const accessToken = data?.token?.access_token;
      const refreshToken = data?.token?.refresh_token;
      const user = data?.user;

      if (!accessToken || !refreshToken || !user) {
        throw new Error('Invalid login response.');
      }

      await login(accessToken, refreshToken, user);
    } catch (loginError: unknown) {
      setError(formatLoginError(loginError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box flex={1} bg={colors.background.base} padding={spacing.lg} justify="center">
      <Text variant="h2" style={{ marginBottom: spacing.xl }}>Tekrar hos geldin</Text>

      <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.text.muted}
          style={{ color: colors.text.primary, fontSize: 16 }}
        />
      </Box>

      <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Your password"
          placeholderTextColor={colors.text.muted}
          style={{ color: colors.text.primary, fontSize: 16 }}
        />
      </Box>

      {error ? (
        <Text color={colors.sentiment.bear_red} style={{ marginBottom: spacing.md }}>{error}</Text>
      ) : null}

      <Pressable onPress={handleLogin} disabled={!canSubmit}>
        <Box
          bg={canSubmit ? colors.background.elevated : colors.background.surface}
          padding={spacing.md}
          radius={radius.md}
          center
          style={{ opacity: canSubmit ? 1 : 0.6 }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.accent.primary_blue} />
          ) : (
            <Text variant="h3" color={colors.accent.primary_blue}>Giris yap</Text>
          )}
        </Box>
      </Pressable>

      {!isSubmitting && email.trim().length > 0 && !isEmailValid ? (
        <Text color={colors.sentiment.bear_red} style={{ marginTop: spacing.sm }}>
          Gecerli bir email girerek devam et.
        </Text>
      ) : null}

      {!isSubmitting && password.length > 0 && password.length < 8 ? (
        <Text color={colors.sentiment.bear_red} style={{ marginTop: spacing.sm }}>
          Sifre en az 8 karakter olmali, sonra tekrar dene.
        </Text>
      ) : null}

      <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }}>
        <Text align="center" color={colors.text.muted}>Geri</Text>
      </Pressable>
    </Box>
  );
};
