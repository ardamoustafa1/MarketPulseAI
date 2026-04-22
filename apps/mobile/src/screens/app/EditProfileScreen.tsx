import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { colors, radius, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';

export const EditProfileScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
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
      setError('Password must be at least 12 characters.');
      return;
    }
    if (password.length > 0 && password !== confirm) {
      setError('Passwords do not match.');
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
      setError(typeof msg === 'string' ? msg : 'Could not save profile.');
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
          Edit profile
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
          First name
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            placeholder="First name"
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, fontSize: 16 }}
          />
        </Box>

        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
          Last name
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            placeholder="Last name"
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, fontSize: 16 }}
          />
        </Box>

        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
          New password (optional, min 12 chars)
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Leave blank to keep current"
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, fontSize: 16 }}
          />
        </Box>

        <Text variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing.xs }}>
          Confirm new password
        </Text>
        <Box bg={colors.background.surface} padding={spacing.md} radius={radius.md} style={{ marginBottom: spacing.md }}>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="Confirm"
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
              {saving ? 'Saving…' : 'Save changes'}
            </Text>
          </Box>
        </Pressable>
      </ScrollView>
    </Box>
  );
};
