import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { HeaderBar } from '../../components/portfolio-powers/HeaderBar';
import { Badge, ShellCard } from '../../components/deep-card/primitives';
import {
  cancelPaperOrder,
  createPaperOrder,
  evaluatePaperOrders,
  listPaperOrders,
} from '../../api/portfolioPowers';
import type {
  PaperOrderList,
  PaperOrderPayload,
  PaperOrderView,
} from '../../types/portfolioPowers';
import { colors, radius, spacing } from '../../theme';

type OrderType = PaperOrderPayload['order_type'];
const ORDER_TYPES: OrderType[] = ['market', 'limit', 'stop', 'stop_limit', 'oco'];

export const PaperOrdersScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PaperOrderList | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'buy' | 'sell'>('sell');
  const [type, setType] = useState<OrderType>('stop');
  const [qty, setQty] = useState('0.01');
  const [limitP, setLimitP] = useState('');
  const [stopP, setStopP] = useState('');
  const [tpP, setTpP] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listPaperOrders());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const payload: PaperOrderPayload = {
        asset_symbol: symbol.trim().toUpperCase(),
        side,
        order_type: type,
        quantity: parseFloat(qty) || 0,
        limit_price: limitP ? parseFloat(limitP) : null,
        stop_price: stopP ? parseFloat(stopP) : null,
        take_profit_price: tpP ? parseFloat(tpP) : null,
        expires_in_hours: 24 * 30,
      };
      await createPaperOrder(payload);
      await load();
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Emir oluşturulamadı');
    } finally {
      setBusy(false);
    }
  };

  const handleEvaluate = async () => {
    setBusy(true);
    try {
      const r = await evaluatePaperOrders();
      Alert.alert('Değerlendirildi', `${r.orders_updated} emir güncellendi.`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await cancelPaperOrder(orderId);
      await load();
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İptal başarısız');
    }
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <HeaderBar
        title="Sanal Emir (Paper)"
        subtitle="Stop-loss · take-profit · OCO · stop-limit"
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
            Yeni Emir
          </Text>

          <LabelledInput label="Sembol" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} autoCaps />
          <LabelledInput label="Miktar" value={qty} onChange={setQty} numeric />

          <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Yön
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['buy', 'sell'] as const).map((s) => (
              <Chip
                key={s}
                label={s === 'buy' ? 'AL' : 'SAT'}
                active={side === s}
                onPress={() => setSide(s)}
                tone={s === 'buy' ? 'positive' : 'negative'}
              />
            ))}
          </View>

          <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Emir tipi
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ORDER_TYPES.map((t) => (
              <Chip
                key={t}
                label={
                  t === 'market'
                    ? 'Market'
                    : t === 'limit'
                      ? 'Limit'
                      : t === 'stop'
                        ? 'Stop'
                        : t === 'stop_limit'
                          ? 'Stop-Limit'
                          : 'OCO'
                }
                active={type === t}
                onPress={() => setType(t)}
              />
            ))}
          </View>

          {(type === 'limit' || type === 'stop_limit' || type === 'oco') && (
            <LabelledInput label="Limit fiyatı" value={limitP} onChange={setLimitP} numeric />
          )}
          {(type === 'stop' || type === 'stop_limit' || type === 'oco') && (
            <LabelledInput label="Stop fiyatı" value={stopP} onChange={setStopP} numeric />
          )}
          {type === 'oco' && (
            <LabelledInput label="Take-profit fiyatı" value={tpP} onChange={setTpP} numeric />
          )}

          <Pressable
            onPress={handleCreate}
            disabled={busy}
            style={({ pressed }) => [
              {
                marginTop: spacing.md,
                backgroundColor: colors.accent.primary_blue,
                borderRadius: radius.md,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.7 : busy ? 0.6 : 1,
              },
            ]}
          >
            <Text variant="body" weight="700" color="#fff">
              {busy ? 'Gönderiliyor…' : 'Emri gönder'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleEvaluate}
            disabled={busy}
            style={({ pressed }) => [
              {
                marginTop: spacing.sm,
                backgroundColor: colors.background.elevated,
                borderRadius: radius.md,
                paddingVertical: 10,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
                borderWidth: 1,
                borderColor: colors.border.soft,
              },
            ]}
          >
            <Text variant="caption" weight="600">
              Açık emirleri canlı fiyata göre değerlendir
            </Text>
          </Pressable>
        </ShellCard>

        {loading ? (
          <ShellCard>
            <ActivityIndicator color={colors.accent.primary_blue} />
          </ShellCard>
        ) : data ? (
          <>
            <OrderSection title="Açık Emirler" orders={data.open} onCancel={handleCancel} />
            <OrderSection title="Geçmiş" orders={data.history} />
          </>
        ) : null}
      </ScrollView>
    </Box>
  );
};

const LabelledInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  autoCaps?: boolean;
}> = ({ label, value, onChange, numeric, autoCaps }) => (
  <View style={{ marginTop: spacing.sm }}>
    <Text variant="caption" color={colors.text.secondary}>
      {label}
    </Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      autoCapitalize={autoCaps ? 'characters' : 'none'}
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

const Chip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: 'positive' | 'negative';
}> = ({ label, active, onPress, tone }) => {
  const activeColor =
    tone === 'positive'
      ? colors.sentiment.bull_green
      : tone === 'negative'
        ? colors.sentiment.bear_red
        : colors.accent.primary_blue;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          marginTop: 4,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: radius.pill,
          backgroundColor: active ? activeColor : colors.background.elevated,
          borderWidth: 1,
          borderColor: active ? activeColor : colors.border.soft,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text variant="caption" weight="600" color={active ? '#fff' : colors.text.primary}>
        {label}
      </Text>
    </Pressable>
  );
};

const OrderSection: React.FC<{
  title: string;
  orders: PaperOrderView[];
  onCancel?: (id: string) => void;
}> = ({ title, orders, onCancel }) => (
  <ShellCard>
    <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>
      {title} ({orders.length})
    </Text>
    {orders.length === 0 ? (
      <Text variant="caption" color={colors.text.secondary}>
        Kayıt yok.
      </Text>
    ) : (
      orders.map((o) => (
        <View
          key={o.id}
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
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Text variant="body" weight="700">
                {o.asset_symbol}
              </Text>
              <Badge
                text={o.side === 'buy' ? 'AL' : 'SAT'}
                tone={o.side === 'buy' ? 'positive' : 'negative'}
              />
              <Badge text={o.order_type} tone="neutral" />
              <Badge
                text={o.status}
                tone={
                  o.status === 'filled'
                    ? 'positive'
                    : o.status === 'cancelled' || o.status === 'expired'
                      ? 'negative'
                      : 'warning'
                }
              />
            </View>
            <Text variant="caption" color={colors.text.secondary} mono style={{ marginTop: 2 }}>
              {o.quantity} · {o.stop_price ? `stop ${o.stop_price}` : ''}{' '}
              {o.limit_price ? `limit ${o.limit_price}` : ''}{' '}
              {o.take_profit_price ? `TP ${o.take_profit_price}` : ''}
            </Text>
          </View>
          {onCancel && (o.status === 'pending' || o.status === 'triggered') && (
            <Pressable
              onPress={() => onCancel(o.id)}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
            >
              <Trash2 color={colors.sentiment.bear_red} size={18} />
            </Pressable>
          )}
        </View>
      ))
    )}
  </ShellCard>
);
