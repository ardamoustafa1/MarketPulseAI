import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { Badge, ShellCard } from '../../components/deep-card/primitives';
import {
  inviteSharedMember,
  listSharedMembers,
  revokeSharedMember,
} from '../../api/portfolioPowers';
import type { SharedMemberView } from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

export const PortfolioSharedScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<SharedMemberView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await listSharedMembers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async () => {
    if (!email.includes('@')) {
      Alert.alert('Geçersiz e-posta');
      return;
    }
    setSaving(true);
    try {
      const invite = await inviteSharedMember({
        invitee_email: email.trim(),
        role,
        message: message || null,
      });
      setEmail('');
      setMessage('');
      await load();
      Alert.alert(
        'Davet gönderildi',
        `Davet kodu: ${invite.invite_token}\n\nPaylaşmak için alttaki butona basın.`,
        [
          { text: 'Tamam' },
          {
            text: 'Paylaş',
            onPress: () => Share.share({ message: `MarketPulseAI ortak portföy daveti: ${invite.invite_token}` }),
          },
        ],
      );
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Davet gönderilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeSharedMember(id);
    await load();
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Aile / Ortak Portföy"
        subtitle="Şeffaf paylaşım ve rol tabanlı erişim"
        onBack={() => navigation?.goBack()}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <ShellCard>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
            Yeni Davet
          </Text>
          <Field label="E-posta" value={email} onChange={setEmail} keyboard="email-address" />
          <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Rol
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['viewer', 'editor'] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={({ pressed }) => [
                  {
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: radius.pill,
                    backgroundColor:
                      role === r ? colors.accent.primary_blue : colors.background.elevated,
                    borderWidth: 1,
                    borderColor: role === r ? colors.accent.primary_blue : colors.border.soft,
                    opacity: pressed ? 0.6 : 1,
                    marginTop: 4,
                  },
                ]}
              >
                <Text variant="caption" weight="600" color={role === r ? '#fff' : colors.text.primary}>
                  {r === 'editor' ? 'Düzenleyici' : 'İzleyici'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label="Not (opsiyonel)" value={message} onChange={setMessage} />
          <Pressable
            onPress={handleInvite}
            disabled={saving}
            style={({ pressed }) => [
              {
                marginTop: spacing.md,
                backgroundColor: colors.accent.primary_blue,
                borderRadius: radius.md,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : saving ? 0.6 : 1,
              },
            ]}
          >
            <Text variant="body" weight="700" color="#fff">
              {saving ? 'Gönderiliyor…' : 'Daveti gönder'}
            </Text>
          </Pressable>
        </ShellCard>

        {loading && (
          <ShellCard>
            <ActivityIndicator color={colors.accent.primary_blue} />
          </ShellCard>
        )}

        <ShellCard>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
            Üyeler ({members.length})
          </Text>
          {members.length === 0 ? (
            <Text variant="caption" color={colors.text.secondary}>
              Henüz üye yok.
            </Text>
          ) : (
            members.map((m) => (
              <View
                key={m.id}
                style={{
                  paddingVertical: spacing.sm,
                  borderBottomColor: colors.border.soft,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="700">
                    {m.invitee_email}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    <Badge
                      text={m.role}
                      tone={m.role === 'editor' ? 'warning' : 'neutral'}
                    />
                    <Badge
                      text={m.accepted ? 'kabul' : 'beklemede'}
                      tone={m.accepted ? 'positive' : 'warning'}
                    />
                  </View>
                </View>
                <Pressable
                  onPress={() => handleRevoke(m.id)}
                  hitSlop={12}
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
                >
                  <Trash2 color={colors.sentiment.bear_red} size={18} />
                </Pressable>
              </View>
            ))
          )}
        </ShellCard>
      </ScrollView>
    </Box>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'default' | 'email-address';
}> = ({ label, value, onChange, keyboard }) => (
  <View style={{ marginTop: spacing.sm }}>
    <Text variant="caption" color={colors.text.secondary}>
      {label}
    </Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      keyboardType={keyboard ?? 'default'}
      style={{
        marginTop: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        backgroundColor: colors.background.elevated,
        borderWidth: 1,
        borderColor: colors.border.soft,
        color: colors.text.primary,
      }}
    />
  </View>
);
