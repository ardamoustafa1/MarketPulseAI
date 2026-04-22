import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';

export const EditProfileScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (password.length > 0 && password.length < 12) {
      setError(t('editProfile.passwordTooShort'));
      return;
    }
    if (password.length > 0 && password !== confirm) {
      setError(t('editProfile.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(password.length > 0 ? { password } : {}),
      });
      setPassword('');
      setConfirm('');
      navigation.goBack();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(typeof msg === 'string' ? msg : t('editProfile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <Box
        row
        align="center"
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h3" weight="700">
          {t('editProfile.title')}
        </Text>
      </Box>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      >
        <Text variant="caption" color={colors.text.muted} style={{ marginBottom: spacing.md }}>
          {user?.email}
        </Text>

        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
          {t('editProfile.firstName')}
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            placeholder={t('editProfile.firstName')}
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, fontSize: 16 }}
          />
        </Box>

        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
          {t('editProfile.lastName')}
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            placeholder={t('editProfile.lastName')}
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, fontSize: 16 }}
          />
        </Box>

        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
          {t('editProfile.newPassword')}
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('editProfile.newPasswordPlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, fontSize: 16 }}
          />
        </Box>

        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
          {t('editProfile.confirmPassword')}
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder={t('editProfile.confirm')}
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, fontSize: 16 }}
          />
        </Box>

        {error ? (
          <Text color={colors.sentiment.bear_red} style={{ marginBottom: spacing.md }}>
            {error}
          </Text>
        ) : null}

        <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => [{ opacity: pressed || saving ? 0.7 : 1 }]}>
          <Box bg={colors.text.primary} padding={spacing.md} radius={radius.md} center>
            <Text color={colors.background.base} weight="700">
              {saving ? t('editProfile.saving') : t('editProfile.save')}
            </Text>
          </Box>
        </Pressable>
      </ScrollView>
    </Box>
  );
};
