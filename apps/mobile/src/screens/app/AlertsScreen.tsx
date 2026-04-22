import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, Platform, ScrollView, Switch } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { GuidedStateCard } from '../../components/ui/GuidedStateCard';
import { useAlertStore } from '../../store/useAlertStore';
import { CreateAlertSheet } from '../../components/alert/CreateAlertSheet';
import { colors, radius, spacing } from '../../theme';
import { Bell, ArrowLeft, History, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { formatCurrencyByLocale } from '../../utils/localeFormat';

export const AlertsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { alerts, isLoading, fetchAlerts, toggleAlert, deleteAlert, error } = useAlertStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter(a => a.is_active);
  const inactiveAlerts = alerts.filter(a => !a.is_active);

  const renderAlertCard = (alert: any, index: number) => {
    const isUp = alert.condition === 'gt' || alert.condition === 'pct_up';
    const isPct = alert.condition.includes('pct');
    
    return (
      <Animated.View key={alert.id} entering={FadeInUp.delay(index * 50)} layout={Layout.springify()}>
        <Box style={[styles.alertCard, !alert.is_active && { opacity: 0.6 }]}>
          <Box row justify="space-between" align="center">
            <Box row align="center">
              <Box center style={[styles.iconBadge, { backgroundColor: isUp ? 'rgba(59,217,132,0.1)' : 'rgba(255,92,92,0.1)' }]}>
                {isUp ? <ArrowUpRight color={colors.sentiment.bull_green} size={20} /> : <ArrowDownRight color={colors.sentiment.bear_red} size={20} />}
              </Box>
              <Box style={{ marginLeft: spacing.md }}>
                <Text variant="h3" weight="700">{alert.asset_id.toUpperCase()}</Text>
                <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                  {isPct ? (isUp ? 'Yuzde yukselirse' : 'Yuzde duserse') : (isUp ? 'Uzerine cikarsa' : 'Altina inerse')}
                </Text>
              </Box>
            </Box>
            <Box align="flex-end">
              <Text variant="h2" weight="700" color={isUp ? colors.sentiment.bull_green : colors.sentiment.bear_red}>
                {isPct ? `${alert.target_price}%` : formatCurrencyByLocale(alert.target_price, 'USD')}
              </Text>
            </Box>
          </Box>
          
          <Box row justify="space-between" align="center" style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
            <Pressable onPress={() => deleteAlert(alert.id)} hitSlop={10}>
              <Box row align="center">
                <Trash2 color={colors.sentiment.bear_red} size={16} />
                <Text variant="caption" color={colors.sentiment.bear_red} style={{ marginLeft: 6 }}>Sil</Text>
              </Box>
            </Pressable>
            <Switch
              value={alert.is_active}
              onValueChange={(val) => toggleAlert(alert.id, val)}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.sentiment.bull_green }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : (alert.is_active ? '#fff' : '#ccc')}
              ios_backgroundColor="rgba(255,255,255,0.1)"
            />
          </Box>
        </Box>
      </Animated.View>
    );
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      {/* Header */}
      <Box
        row justify="space-between" align="center"
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <Pressable hitSlop={20} onPress={() => navigation?.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Box center style={styles.headerBtn}>
            <ArrowLeft color={colors.text.primary} size={20} />
          </Box>
        </Pressable>
        <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>Fiyat Alarmlari</Text>
        <Pressable hitSlop={20} onPress={() => navigation?.navigate('AlertHistory')} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Box center style={styles.headerBtn}>
            <History color={colors.text.primary} size={20} />
          </Box>
        </Pressable>
      </Box>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {error ? (
          <Box style={{ marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,92,92,0.2)', backgroundColor: 'rgba(255,92,92,0.1)' }}>
            <Text variant="caption" color={colors.sentiment.bear_red}>
              {`${error} Tekrar denemek icin sayfayi asagi cekerek yenile.`}
            </Text>
          </Box>
        ) : null}
        {isLoading && alerts.length === 0 ? (
          <Box center padding={spacing.xl}>
            <Text variant="body" color={colors.text.muted}>Alarmlar yukleniyor...</Text>
          </Box>
        ) : alerts.length === 0 ? (
          <GuidedStateCard
            title="Aktif alarmin yok"
            description="Firsatlari kacirmamak icin fiyat ya da yuzde degisim alarmini olustur."
            ctaLabel="Ilk alarmi kur"
            onPress={() => setShowCreate(true)}
            icon={<Bell color={colors.text.muted} size={32} />}
          />
        ) : (
          <>
            {activeAlerts.length > 0 && (
              <Box style={{ marginBottom: spacing.xl }}>
                <Text variant="caption" weight="600" color={colors.text.muted} style={{ marginBottom: spacing.md, marginLeft: 4 }}>AKTIF ALARMLAR</Text>
                {activeAlerts.map(renderAlertCard)}
              </Box>
            )}
            {inactiveAlerts.length > 0 && (
              <Box>
                <Text variant="caption" weight="600" color={colors.text.muted} style={{ marginBottom: spacing.md, marginLeft: 4 }}>PASIF ALARMLAR</Text>
                {inactiveAlerts.map(renderAlertCard)}
              </Box>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable onPress={() => setShowCreate(true)} style={styles.fab}>
        <Box center style={styles.fabInner}>
          <Plus color={colors.background.base} size={24} />
        </Box>
      </Pressable>

      <CreateAlertSheet visible={showCreate} onClose={() => setShowCreate(false)} />
    </Box>
  );
};

const styles = StyleSheet.create({
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  alertCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 48, height: 48, borderRadius: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: spacing.lg,
    shadowColor: '#fff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
  },
  fabInner: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.text.primary,
  }
});
