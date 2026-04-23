import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  BellRing,
  CheckCircle2,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react-native';

import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import {
  createFormulaAlert,
  deleteFormulaAlert,
  evaluateAllFormulaAlerts,
  fetchFormulaAlerts,
  toggleFormulaAlert,
} from '../../api/proTools';
import type {
  FormulaAlertView,
  FormulaCondition,
  FormulaMetric,
  FormulaOperator,
} from '../../types/proTools';
import { colors, radius, spacing } from '../../theme';

const METRIC_OPTIONS: { value: FormulaMetric; label: string }[] = [
  { value: 'price', label: 'Fiyat' },
  { value: 'ratio', label: 'Oran (A/B)' },
  { value: 'percent_change_24h', label: '24s değişim %' },
  { value: 'rsi_14', label: 'RSI 14' },
  { value: 'volatility_30d', label: 'Volatilite 30g' },
];

const OPERATOR_OPTIONS: { value: FormulaOperator; label: string }[] = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
];

export const FormulaAlertsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<FormulaAlertView[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [name, setName] = useState('Yeni formül uyarısı');
  const [logical, setLogical] = useState<'and' | 'or'>('and');
  const [conds, setConds] = useState<FormulaCondition[]>([
    { symbol: 'BTC', metric: 'price', operator: 'gt', target: 100000 },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFormulaAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addCondition = () => {
    setConds((cs) => [
      ...cs,
      { symbol: '', metric: 'price', operator: 'gt', target: 0 },
    ]);
  };

  const updateCondition = (idx: number, patch: Partial<FormulaCondition>) => {
    setConds((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeCondition = (idx: number) => {
    setConds((cs) => cs.filter((_, i) => i !== idx));
  };

  const onCreate = async () => {
    try {
      await createFormulaAlert({
        name,
        conditions: conds,
        logical_operator: logical,
        notify_push: true,
        notify_email: false,
      });
      setShowNew(false);
      setName('Yeni formül uyarısı');
      setConds([{ symbol: 'BTC', metric: 'price', operator: 'gt', target: 100000 }]);
      void load();
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Oluşturulamadı');
    }
  };

  const onToggle = async (alert: FormulaAlertView) => {
    await toggleFormulaAlert(alert.id, !alert.is_active);
    void load();
  };

  const onDelete = async (alert: FormulaAlertView) => {
    await deleteFormulaAlert(alert.id);
    void load();
  };

  const onEvaluate = async () => {
    const res = await evaluateAllFormulaAlerts();
    const triggered = res.filter((r) => r.triggered).length;
    Alert.alert(
      'Değerlendirme tamam',
      `${res.length} uyarı tarandı, ${triggered} tanesi tetiklendi.`,
    );
    void load();
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Formül Bazlı Uyarılar"
        subtitle="Çoklu koşul ve mantıksal operatör"
        onBack={() => navigation?.goBack()}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable
            onPress={() => setShowNew((v) => !v)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              borderRadius: radius.md,
              backgroundColor: colors.accent.premium_gold,
            }}
          >
            <Plus size={18} color="#0B0B0F" />
            <Text variant="caption" weight="700" color="#0B0B0F">
              Yeni uyarı
            </Text>
          </Pressable>
          <Pressable
            onPress={onEvaluate}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border.soft,
              backgroundColor: colors.background.surface,
            }}
          >
            <Zap size={18} color={colors.accent.premium_gold} />
            <Text variant="caption" weight="700">
              Hepsini değerlendir
            </Text>
          </Pressable>
        </View>

        {showNew && (
          <Animated.View entering={FadeInUp.springify().damping(16)}>
            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <Text variant="caption" color={colors.text.muted}>
                Uyarı adı
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.text.muted}
                style={{
                  color: colors.text.primary,
                  borderWidth: 1,
                  borderColor: colors.border.soft,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 8,
                }}
              />
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {(['and', 'or'] as const).map((op) => (
                  <Pressable
                    key={op}
                    onPress={() => setLogical(op)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: 6,
                      borderRadius: radius.pill,
                      backgroundColor:
                        logical === op
                          ? colors.accent.premium_gold
                          : 'transparent',
                      borderWidth: 1,
                      borderColor: colors.border.soft,
                    }}
                  >
                    <Text
                      variant="caption"
                      weight="700"
                      color={logical === op ? '#0B0B0F' : colors.text.primary}
                    >
                      {op.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {conds.map((c, i) => (
                <View
                  key={i}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border.soft,
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TextInput
                      value={c.symbol}
                      onChangeText={(v) =>
                        updateCondition(i, { symbol: v.toUpperCase().trim() })
                      }
                      placeholder="Sembol"
                      placeholderTextColor={colors.text.muted}
                      style={{
                        flex: 1,
                        color: colors.text.primary,
                        borderWidth: 1,
                        borderColor: colors.border.soft,
                        borderRadius: radius.sm,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                      }}
                    />
                    <Pressable onPress={() => removeCondition(i)}>
                      <Trash2 size={18} color={colors.sentiment.bear_red} />
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {METRIC_OPTIONS.map((m) => (
                        <Pressable
                          key={m.value}
                          onPress={() => updateCondition(i, { metric: m.value })}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: radius.pill,
                            borderWidth: 1,
                            borderColor:
                              c.metric === m.value
                                ? colors.accent.premium_gold
                                : colors.border.soft,
                            backgroundColor:
                              c.metric === m.value
                                ? `${colors.accent.premium_gold}22`
                                : 'transparent',
                          }}
                        >
                          <Text variant="caption">{m.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {OPERATOR_OPTIONS.map((op) => (
                      <Pressable
                        key={op.value}
                        onPress={() =>
                          updateCondition(i, { operator: op.value })
                        }
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: radius.pill,
                          borderWidth: 1,
                          borderColor:
                            c.operator === op.value
                              ? colors.accent.premium_gold
                              : colors.border.soft,
                        }}
                      >
                        <Text variant="caption">{op.label}</Text>
                      </Pressable>
                    ))}
                    <TextInput
                      value={String(c.target)}
                      onChangeText={(v) =>
                        updateCondition(i, { target: Number(v) || 0 })
                      }
                      keyboardType="numeric"
                      placeholder="Eşik"
                      placeholderTextColor={colors.text.muted}
                      style={{
                        flex: 1,
                        color: colors.text.primary,
                        borderWidth: 1,
                        borderColor: colors.border.soft,
                        borderRadius: radius.sm,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    />
                  </View>
                  {c.metric === 'ratio' && (
                    <TextInput
                      value={c.reference_symbol ?? ''}
                      onChangeText={(v) =>
                        updateCondition(i, { reference_symbol: v.toUpperCase().trim() })
                      }
                      placeholder="Referans sembol (ör. BTC)"
                      placeholderTextColor={colors.text.muted}
                      style={{
                        color: colors.text.primary,
                        borderWidth: 1,
                        borderColor: colors.border.soft,
                        borderRadius: radius.sm,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                      }}
                    />
                  )}
                </View>
              ))}
              <Pressable
                onPress={addCondition}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: 8,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border.soft,
                }}
              >
                <Plus size={14} color={colors.text.secondary} />
                <Text variant="caption" color={colors.text.secondary}>
                  Koşul ekle
                </Text>
              </Pressable>
              <Pressable
                onPress={onCreate}
                style={{
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  backgroundColor: colors.accent.premium_gold,
                  alignItems: 'center',
                }}
              >
                <Text variant="caption" weight="700" color="#0B0B0F">
                  Kaydet
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {loading && alerts.length === 0 && (
          <ActivityIndicator color={colors.accent.premium_gold} />
        )}

        {alerts.map((a, i) => (
          <Animated.View
            key={a.id}
            entering={FadeInUp.delay(i * 40).springify().damping(18)}
          >
            <View
              style={{
                backgroundColor: colors.background.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border.soft,
                padding: spacing.md,
                gap: 6,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <BellRing size={18} color={colors.accent.premium_gold} />
                <Text variant="body" weight="700" style={{ flex: 1 }}>
                  {a.name}
                </Text>
                <Switch
                  value={a.is_active}
                  onValueChange={() => onToggle(a)}
                />
                <Pressable onPress={() => onDelete(a)}>
                  <Trash2 size={16} color={colors.sentiment.bear_red} />
                </Pressable>
              </View>
              {a.conditions.map((c, j) => (
                <Text key={j} variant="caption" color={colors.text.secondary}>
                  · {c.symbol} {c.metric} {c.operator} {c.target}
                </Text>
              ))}
              <Text variant="caption" color={colors.text.muted}>
                {a.logical_operator.toUpperCase()} mantığı · tetiklenme{' '}
                {a.trigger_count}x
              </Text>
              {a.last_triggered_at && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={12} color="#3BD984" />
                  <Text variant="caption" color="#3BD984">
                    Son tetik: {new Date(a.last_triggered_at).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </Box>
  );
};
