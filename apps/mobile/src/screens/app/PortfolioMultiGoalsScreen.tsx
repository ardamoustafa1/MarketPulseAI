import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2 } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { Badge, ShellCard } from '../../components/deep-card/primitives';
import {
  archiveMultiAssetGoal,
  createMultiAssetGoal,
  listMultiAssetGoals,
} from '../../api/portfolioPowers';
import type { MultiAssetGoalView } from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

const RISK_MODES = ['conservative', 'balanced', 'aggressive'] as const;

export const PortfolioMultiGoalsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<MultiAssetGoalView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('Düğün fonu');
  const [dueDate, setDueDate] = useState('2026-12-01');
  const [monthly, setMonthly] = useState('5000');
  const [risk, setRisk] = useState<(typeof RISK_MODES)[number]>('balanced');
  const [targets, setTargets] = useState([
    { symbol: 'XAUTRY', quantity: '50' },
    { symbol: 'BTCUSDT', quantity: '1' },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGoals(await listMultiAssetGoals());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createMultiAssetGoal({
        title,
        due_date: dueDate || null,
        risk_mode: risk,
        monthly_contribution: monthly ? parseFloat(monthly) : null,
        target_composition: targets
          .filter((t) => t.symbol && t.quantity)
          .map((t) => ({ symbol: t.symbol.toUpperCase(), quantity: parseFloat(t.quantity) })),
      });
      await load();
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Hedef oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    await archiveMultiAssetGoal(id);
    await load();
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Çok-Varlıklı Hedef"
        subtitle="Birden fazla varlık — tek hedef"
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
            Yeni Hedef
          </Text>

          <Field label="Başlık" value={title} onChange={setTitle} />
          <Field label="Hedef tarih (YYYY-MM-DD)" value={dueDate} onChange={setDueDate} />
          <Field
            label="Aylık katkı (TRY)"
            value={monthly}
            onChange={setMonthly}
            numeric
          />

          <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Risk modu
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {RISK_MODES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRisk(r)}
                style={({ pressed }) => [
                  {
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: radius.pill,
                    backgroundColor:
                      risk === r ? colors.accent.primary_blue : colors.background.elevated,
                    borderWidth: 1,
                    borderColor: risk === r ? colors.accent.primary_blue : colors.border.soft,
                    opacity: pressed ? 0.6 : 1,
                    marginTop: 4,
                  },
                ]}
              >
                <Text variant="caption" weight="600" color={risk === r ? '#fff' : colors.text.primary}>
                  {r === 'conservative' ? 'Temkinli' : r === 'balanced' ? 'Dengeli' : 'Agresif'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Hedef kompozisyon
          </Text>
          <View style={{ gap: 6 }}>
            {targets.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput
                  value={t.symbol}
                  onChangeText={(v) => {
                    const nr = [...targets];
                    nr[i] = { ...nr[i], symbol: v.toUpperCase() };
                    setTargets(nr);
                  }}
                  autoCapitalize="characters"
                  placeholder="SEMBOL"
                  placeholderTextColor={colors.text.muted}
                  style={rowInput(2)}
                />
                <TextInput
                  value={t.quantity}
                  onChangeText={(v) => {
                    const nr = [...targets];
                    nr[i] = { ...nr[i], quantity: v };
                    setTargets(nr);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Miktar"
                  placeholderTextColor={colors.text.muted}
                  style={rowInput(1)}
                />
                <Pressable
                  onPress={() => setTargets(targets.filter((_, j) => j !== i))}
                  hitSlop={12}
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
                >
                  <Trash2 color={colors.text.muted} size={18} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => setTargets([...targets, { symbol: '', quantity: '' }])}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Plus size={16} color={colors.accent.primary_blue} />
              <Text variant="caption" weight="600" color={colors.accent.primary_blue}>
                Varlık ekle
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleCreate}
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
              {saving ? 'Oluşturuluyor…' : 'Hedefi oluştur'}
            </Text>
          </Pressable>
        </ShellCard>

        {loading && (
          <ShellCard>
            <ActivityIndicator color={colors.accent.primary_blue} />
          </ShellCard>
        )}

        {goals.map((g) => (
          <ShellCard key={g.id}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="h3" weight="700">
                  {g.title}
                </Text>
                {g.due_date ? (
                  <Text variant="caption" color={colors.text.secondary}>
                    {g.due_date}
                  </Text>
                ) : null}
              </View>
              <Badge
                text={g.tempo_label === 'ahead' ? 'ÖNDE' : g.tempo_label === 'behind' ? 'GERİDE' : 'HIZINDA'}
                tone={
                  g.tempo_label === 'ahead'
                    ? 'positive'
                    : g.tempo_label === 'behind'
                      ? 'negative'
                      : 'neutral'
                }
              />
              <Pressable
                onPress={() => handleArchive(g.id)}
                hitSlop={12}
                style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, marginLeft: spacing.sm }]}
              >
                <Trash2 color={colors.text.muted} size={18} />
              </Pressable>
            </View>

            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              {g.progress.map((p) => (
                <View key={p.symbol}>
                  <View
                    style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                  >
                    <Text variant="body">{p.symbol}</Text>
                    <Text variant="body" mono>
                      {p.current_quantity.toFixed(4)} / {p.target_quantity.toFixed(4)}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: colors.background.elevated,
                      borderRadius: radius.sm,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.min(100, Math.max(0, p.progress_pct))}%`,
                        height: '100%',
                        backgroundColor: colors.sentiment.bull_green,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>

            <Text
              variant="caption"
              color={colors.text.secondary}
              style={{ marginTop: spacing.sm }}
            >
              Gerekli aylık ≈ ${g.required_monthly_usd.toFixed(0)} · Şu anki katkı ≈ $
              {(g.monthly_contribution ?? 0).toFixed(0)}
            </Text>
          </ShellCard>
        ))}
      </ScrollView>
    </Box>
  );
};

const rowInput = (flex: number) => ({
  flex,
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: radius.md,
  backgroundColor: colors.background.elevated,
  borderWidth: 1,
  borderColor: colors.border.soft,
  color: colors.text.primary,
});

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}> = ({ label, value, onChange, numeric }) => (
  <View style={{ marginTop: spacing.sm }}>
    <Text variant="caption" color={colors.text.secondary}>
      {label}
    </Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
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
