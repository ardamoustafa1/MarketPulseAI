import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView, Pressable, StyleSheet, Platform,
  TextInput, KeyboardAvoidingView, Keyboard, View, Alert
} from 'react-native';
import Animated, { FadeInUp, FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { ConfirmTransactionSheet } from '../../components/transaction/ConfirmTransactionSheet';
import { AssetPickerSheet, AssetItem } from '../../components/transaction/AssetPickerSheet';
import { TransactionSuccessOverlay } from '../../components/transaction/TransactionSuccessOverlay';
import { formatCurrency } from '../../utils/formatters';
import { useTransactionForm } from '../../hooks/useTransactionForm';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { colors, radius, spacing } from '../../theme';
import { formatDateTimeByLocale } from '../../utils/localeFormat';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  FileText,
  DollarSign,
  Hash,
  Percent,
  StickyNote,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';

export const AddTransactionScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // ── Form Hook ──
  const {
    form, errors, touched, isDirty, isValid, total,
    updateField, updateDecimalField, markTouched,
    setType, selectAsset, setDate,
    validateAll, reset, getVisibleError,
  } = useTransactionForm();

  // ── Local UI State ──
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ type: 'buy' as 'buy' | 'sell', symbol: '', qty: '' });

  // ── Store ──
  const { isSubmitting, submitTransaction, error: storeError } = usePortfolioStore();

  // ── Asset Selection ──
  const handleAssetSelect = useCallback((asset: AssetItem) => {
    selectAsset(asset.id, asset.symbol, asset.name);
    setShowAssetPicker(false);
  }, [selectAsset]);

  // ── Review (opens confirm modal) ──
  const handleReview = useCallback(() => {
    Keyboard.dismiss();
    const isFormValid = validateAll();
    if (isFormValid) {
      const qty = Number(form.quantity || '0');
      const price = Number(form.unitPrice || '0');
      const notional = qty * price;
      if (form.type === 'sell' && notional >= 10000) {
        Alert.alert(
          t('addTx.behavioralTitle'),
          t('addTx.behavioralDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.continue'), style: 'destructive', onPress: () => setShowConfirm(true) },
          ]
        );
        return;
      }
      setShowConfirm(true);
    } else {
      // Scroll up to show errors
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [validateAll, form.quantity, form.unitPrice, form.type]);

  const handleConfirm = useCallback(async () => {
    const result = await submitTransaction(form);
    
    if (result.success) {
      // Save data for success overlay before resetting form
      setSuccessData({
        type: form.type,
        symbol: form.assetSymbol,
        qty: form.quantity,
      });
      setShowConfirm(false);

      // Small delay then show success
      setTimeout(() => setShowSuccess(true), 200);
      reset();
    } else {
      // Error is stored in storeError; haptic feedback, do not close modal
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [form, submitTransaction, reset]);

  // ── Dismiss / Reset Warnings ──
  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(t('addTx.unsavedTitle'), t('addTx.unsavedDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('addTx.exit'), style: 'destructive', onPress: () => navigation?.goBack() }
      ]);
    } else {
      navigation?.goBack();
    }
  }, [isDirty, navigation]);

  const handleReset = useCallback(() => {
    if (isDirty) {
      Alert.alert(t('addTx.resetTitle'), t('addTx.resetDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('addTx.reset'), style: 'destructive', onPress: reset }
      ]);
    }
  }, [isDirty, reset]);

  // ── Success Dismiss ──
  const handleSuccessDismiss = useCallback(() => {
    setShowSuccess(false);
    navigation?.goBack();
  }, [navigation]);

  const isBuy = form.type === 'buy';
  const accentColor = isBuy ? colors.sentiment.bull_green : colors.sentiment.bear_red;

  return (
    <Box flex={1} bg={colors.background.base}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* ── Header ── */}
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
          <Pressable hitSlop={20} onPress={handleBack} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Box center style={styles.iconBtn}>
              <ArrowLeft color={colors.text.primary} size={20} />
            </Box>
          </Pressable>
          <Box center>
            <Text variant="h3" weight="700" style={{ letterSpacing: -0.3 }}>{t('addTx.title')}</Text>
            {isDirty && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text variant="caption" color={colors.accent.premium_gold} style={{ fontSize: 10, marginTop: 2 }}>
                  {t('addTx.unsaved')}
                </Text>
              </Animated.View>
            )}
          </Box>
          <Pressable hitSlop={20} onPress={handleReset} style={({ pressed }) => [{ opacity: pressed ? 0.6 : isDirty ? 1 : 0.3 }]} disabled={!isDirty}>
            <Text variant="caption" weight="600" color={colors.text.muted}>{t('addTx.reset')}</Text>
          </Pressable>
        </Box>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + 100,
            paddingTop: spacing.sm,
          }}
        >

          {/* ── Type Toggle ── */}
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <Box row style={{ marginBottom: spacing.lg }}>
              <Pressable onPress={() => setType('buy')} style={{ flex: 1, marginRight: spacing.xs }}>
                <LinearGradient
                  colors={isBuy
                    ? ['rgba(59,217,132,0.95)', 'rgba(40,180,110,0.95)']
                    : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.02)']
                  }
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.typeBtn, isBuy && styles.typeBtnActive]}
                >
                  <Box row center>
                    <ArrowDownRight color={isBuy ? colors.background.base : colors.text.muted} size={20} style={{ marginRight: 6 }} />
                    <Text variant="h3" weight="700" color={isBuy ? colors.background.base : colors.text.muted}>{t('common.buy')}</Text>
                  </Box>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => setType('sell')} style={{ flex: 1, marginLeft: spacing.xs }}>
                <LinearGradient
                  colors={!isBuy
                    ? ['rgba(255,92,92,0.95)', 'rgba(200,60,60,0.95)']
                    : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.02)']
                  }
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.typeBtn, !isBuy && styles.typeBtnActive]}
                >
                  <Box row center>
                    <ArrowUpRight color={!isBuy ? colors.background.base : colors.text.muted} size={20} style={{ marginRight: 6 }} />
                    <Text variant="h3" weight="700" color={!isBuy ? colors.background.base : colors.text.muted}>{t('common.sell')}</Text>
                  </Box>
                </LinearGradient>
              </Pressable>
            </Box>
          </Animated.View>

          {/* ── Asset Picker ── */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <FormLabel label={t('addTx.asset')} icon={<Sparkles color={colors.accent.premium_gold} size={14} />} error={getVisibleError('assetId')} required />
            <Pressable onPress={() => setShowAssetPicker(true)}>
              <Box
                row justify="space-between" align="center"
                style={[
                  styles.inputContainer,
                  getVisibleError('assetId') ? styles.inputError : null,
                  form.assetSymbol ? styles.inputFilled : null,
                ]}
              >
                <Box row align="center" flex={1}>
                  {form.assetSymbol ? (
                    <>
                      <Box center style={styles.assetBadgeInline}>
                        <Text variant="caption" weight="700" style={{ fontSize: 11 }}>
                          {form.assetSymbol.slice(0, 2)}
                        </Text>
                      </Box>
                      <Box style={{ marginLeft: spacing.sm }}>
                        <Text variant="body" weight="600">{form.assetSymbol}</Text>
                        <Text variant="caption" color={colors.text.muted} style={{ fontSize: 11 }}>{form.assetName}</Text>
                      </Box>
                    </>
                  ) : (
                    <Text variant="body" color={colors.text.muted}>{t('addTx.selectAssetHint')}</Text>
                  )}
                </Box>
                <ChevronDown color={colors.text.muted} size={20} />
              </Box>
            </Pressable>
          </Animated.View>

          {/* ── Quantity ── */}
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <FormLabel label={t('addTx.quantity')} icon={<Hash color={colors.text.muted} size={14} />} error={getVisibleError('quantity')} required />
            <Box row align="center" style={[styles.inputContainer, getVisibleError('quantity') ? styles.inputError : null]}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="0.00000000"
                placeholderTextColor={colors.text.muted}
                keyboardType="decimal-pad"
                value={form.quantity}
                onChangeText={(v) => updateDecimalField('quantity', v)}
                onBlur={() => markTouched('quantity')}
                returnKeyType="next"
              />
              {form.assetSymbol ? (
                <Box style={styles.unitBadge}>
                  <Text variant="caption" weight="600" color={colors.text.secondary} style={{ fontSize: 12 }}>{form.assetSymbol}</Text>
                </Box>
              ) : null}
            </Box>
          </Animated.View>

          {/* ── Unit Price ── */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <FormLabel label={t('addTx.unitPrice')} icon={<DollarSign color={colors.text.muted} size={14} />} error={getVisibleError('unitPrice')} required />
            <Box row align="center" style={[styles.inputContainer, getVisibleError('unitPrice') ? styles.inputError : null]}>
              <Text variant="body" color={colors.text.muted} weight="500" style={{ marginRight: 4 }}>$</Text>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={colors.text.muted}
                keyboardType="decimal-pad"
                value={form.unitPrice}
                onChangeText={(v) => updateDecimalField('unitPrice', v)}
                onBlur={() => markTouched('unitPrice')}
                returnKeyType="next"
              />
              <Box style={styles.unitBadge}>
                <Text variant="caption" weight="600" color={colors.text.secondary} style={{ fontSize: 12 }}>USD</Text>
              </Box>
            </Box>
          </Animated.View>

          {/* ── Fee (Optional) ── */}
          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <FormLabel label={t('addTx.fee')} icon={<Percent color={colors.text.muted} size={14} />} error={getVisibleError('fee')} />
            <Box row align="center" style={[styles.inputContainer, getVisibleError('fee') ? styles.inputError : null]}>
              <Text variant="body" color={colors.text.muted} weight="500" style={{ marginRight: 4 }}>$</Text>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={colors.text.muted}
                keyboardType="decimal-pad"
                value={form.fee}
                onChangeText={(v) => updateDecimalField('fee', v)}
                onBlur={() => markTouched('fee')}
                returnKeyType="next"
              />
              <Box style={styles.unitBadge}>
                <Text variant="caption" weight="600" color={colors.text.secondary} style={{ fontSize: 12 }}>USD</Text>
              </Box>
            </Box>
          </Animated.View>

          {/* ── Date Picker ── */}
          <Animated.View entering={FadeInUp.delay(275).springify()}>
            <FormLabel label={t('addTx.transactionDate')} icon={<Calendar color={colors.text.muted} size={14} />} error={getVisibleError('date')} required />
            <Pressable onPress={() => {
              // In production: use @react-native-community/datetimepicker
              // For now, we show the current date (date picker integration ready)
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}>
              <Box row justify="space-between" align="center" style={[styles.inputContainer, styles.inputFilled]}>
                <Box row align="center">
                  <Calendar color={colors.text.secondary} size={18} style={{ marginRight: spacing.sm }} />
                  <Box>
                    <Text variant="body" weight="500">{formatDateTimeByLocale(form.date).date}</Text>
                    <Text variant="caption" color={colors.text.muted} style={{ fontSize: 11, marginTop: 1 }}>
                      {formatDateTimeByLocale(form.date).time}
                    </Text>
                  </Box>
                </Box>
                <ChevronDown color={colors.text.muted} size={18} />
              </Box>
            </Pressable>
          </Animated.View>

          {/* ── Note (Optional) ── */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <FormLabel label={t('addTx.note')} icon={<StickyNote color={colors.text.muted} size={14} />} error={getVisibleError('note')} />
            <Box style={[styles.inputContainer, getVisibleError('note') ? styles.inputError : null]}>
              <TextInput
                style={[styles.textInput, { minHeight: 72, textAlignVertical: 'top', paddingTop: Platform.OS === 'ios' ? 12 : 8 }]}
                placeholder={t('addTx.notePlaceholder')}
                placeholderTextColor={colors.text.muted}
                multiline
                maxLength={500}
                value={form.note}
                onChangeText={(v) => updateField('note', v)}
                onBlur={() => markTouched('note')}
              />
              {form.note.length > 0 && (
                <Text variant="caption" color={colors.text.muted} style={{ textAlign: 'right', marginTop: 4, fontSize: 10 }}>
                  {form.note.length}/500
                </Text>
              )}
            </Box>
          </Animated.View>

          {/* ── Live Total Preview ── */}
          {(form.quantity && form.unitPrice && parseFloat(form.quantity) > 0 && parseFloat(form.unitPrice) > 0) ? (
            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <PremiumCard
                delay={0}
                glowColor={isBuy ? 'rgba(59,217,132,0.08)' : 'rgba(255,92,92,0.08)'}
                style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
              >
                <Box row justify="space-between" align="center">
                  <Box>
                    <Text variant="caption" color={colors.text.muted} weight="700" style={{ letterSpacing: 1.2, fontSize: 11 }}>
                      {isBuy ? t('addTx.estimatedCost') : t('addTx.estimatedProceeds')}
                    </Text>
                    {total.feeAmount > 0 && (
                      <Text variant="caption" color={colors.text.muted} style={{ marginTop: 4, fontSize: 11 }}>
                        {t('addTx.feeLine', { amount: total.feeAmount.toFixed(2) })}
                      </Text>
                    )}
                  </Box>
                  <Text variant="h1" weight="700" style={{ letterSpacing: -1.5, fontSize: 30 }}>
                    {formatCurrency(total.total)}
                  </Text>
                </Box>
              </PremiumCard>
            </Animated.View>
          ) : null}

          {/* ── Error Summary ── */}
          {Object.keys(errors).length > 0 && Object.values(touched).some(t => t) && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Box row align="center" style={styles.errorSummary}>
                <AlertCircle color={colors.sentiment.bear_red} size={16} />
                <Text variant="caption" color={colors.sentiment.bear_red} weight="500" style={{ marginLeft: spacing.xs }}>
                  {t('addTx.errorSummary')}
                </Text>
              </Box>
            </Animated.View>
          )}

          {/* ── Review Button ── */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <Pressable onPress={handleReview} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: spacing.lg }]}>
              <LinearGradient
                colors={['rgba(245,245,245,1)', 'rgba(220,220,220,1)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.reviewBtn}
              >
                <Text variant="h3" weight="700" color={colors.background.base} style={{ fontSize: 17, letterSpacing: -0.2 }}>
                  {t('addTx.preview')}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modals ── */}
      <AssetPickerSheet
        visible={showAssetPicker}
        selectedId={form.assetId}
        onSelect={handleAssetSelect}
        onClose={() => setShowAssetPicker(false)}
      />

      <ConfirmTransactionSheet
        visible={showConfirm}
        data={form}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        isSubmitting={isSubmitting}
        error={storeError}
      />

      <TransactionSuccessOverlay
        visible={showSuccess}
        type={successData.type}
        assetSymbol={successData.symbol}
        quantity={successData.qty}
        onDismiss={handleSuccessDismiss}
      />
    </Box>
  );
};

// ── Sub Components ──
const FormLabel: React.FC<{
  label: string;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
}> = ({ label, icon, error, required }) => (
  <Box row justify="space-between" align="center" style={{ marginBottom: 8, marginTop: spacing.lg }}>
    <Box row align="center">
      {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
      <Text variant="caption" color={colors.text.secondary} weight="700" style={{ letterSpacing: 0.8, fontSize: 12 }}>
        {label.toUpperCase()}
      </Text>
      {required && (
        <Text variant="caption" color={colors.sentiment.bear_red} weight="700" style={{ marginLeft: 3 }}>*</Text>
      )}
    </Box>
    {error && (
      <Animated.View entering={FadeIn.duration(200)}>
        <Box row align="center">
          <AlertCircle color={colors.sentiment.bear_red} size={12} style={{ marginRight: 3 }} />
          <Text variant="caption" color={colors.sentiment.bear_red} weight="600" style={{ fontSize: 11 }}>{error}</Text>
        </Box>
      </Animated.View>
    )}
  </Box>
);

// ── Styles ──
const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  typeBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  typeBtnActive: {
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : spacing.sm,
    marginBottom: 2,
    minHeight: 54,
    justifyContent: 'center',
  },
  inputFilled: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputError: {
    borderColor: 'rgba(255,92,92,0.4)',
    backgroundColor: 'rgba(255,92,92,0.03)',
  },
  textInput: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
  },
  unitBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
  },
  assetBadgeInline: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  errorSummary: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,92,92,0.06)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,92,92,0.15)',
  },
  reviewBtn: {
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
});
