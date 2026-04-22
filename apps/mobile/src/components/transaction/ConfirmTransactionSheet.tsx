import React from 'react';
import { StyleSheet, Pressable, Platform, Modal, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { PremiumCard } from '../ui/PremiumCard';
import { formatCurrency } from '../../utils/formatters';
import { TransactionFormData, computeTotal } from '../../utils/transactionValidation';
import { colors, radius, spacing } from '../../theme';
import { Check, X, ArrowDownRight, ArrowUpRight, AlertTriangle, Shield } from 'lucide-react-native';

interface ConfirmSheetProps {
  visible: boolean;
  data: TransactionFormData;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string | null;
}

export const ConfirmTransactionSheet: React.FC<ConfirmSheetProps> = ({
  visible, data, onConfirm, onCancel, isSubmitting, error
}) => {
  const { subtotal, feeAmount, total } = computeTotal(data);
  const isBuy = data.type === 'buy';

  const handleConfirm = () => {
    if (isSubmitting) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onConfirm();
  };

  const dateStr = data.date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr = data.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Box flex={1} center bg="rgba(0,0,0,0.75)" padding={spacing.lg}>
        <Animated.View entering={FadeInUp.springify().damping(20)} style={{ width: '100%' }}>
          <PremiumCard>

            {/* Header */}
            <Box row justify="space-between" align="center" style={{ marginBottom: spacing.lg }}>
              <Box row align="center">
                <Animated.View entering={ZoomIn.delay(150).springify()}>
                  <Box center style={[styles.typeBadge, { backgroundColor: isBuy ? 'rgba(59,217,132,0.15)' : 'rgba(255,92,92,0.15)' }]}>
                    {isBuy
                      ? <ArrowDownRight color={colors.sentiment.bull_green} size={22} />
                      : <ArrowUpRight color={colors.sentiment.bear_red} size={22} />
                    }
                  </Box>
                </Animated.View>
                <Box style={{ marginLeft: spacing.md }}>
                  <Text variant="h2" weight="700" style={{ letterSpacing: -0.5 }}>
                    Confirm {isBuy ? 'Purchase' : 'Sale'}
                  </Text>
                  <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                    Review the details below
                  </Text>
                </Box>
              </Box>
              <Pressable onPress={onCancel} hitSlop={15} disabled={isSubmitting}>
                <Box center style={styles.closeBtn}>
                  <X color={colors.text.muted} size={18} />
                </Box>
              </Pressable>
            </Box>

            {/* Detail Lines */}
            <Box style={styles.detailBlock}>
              <DetailLine label="Asset" value={`${data.assetSymbol}`} subValue={data.assetName} />
              <DetailLine
                label="Type"
                value={isBuy ? 'Buy' : 'Sell'}
                valueColor={isBuy ? colors.sentiment.bull_green : colors.sentiment.bear_red}
              />
              <DetailLine label="Quantity" value={parseFloat(data.quantity).toLocaleString('en-US', { maximumFractionDigits: 8 })} />
              <DetailLine label="Unit Price" value={formatCurrency(data.unitPrice)} />
              <DetailLine label="Subtotal" value={formatCurrency(subtotal)} />
              {feeAmount > 0 && (
                <DetailLine label="Fee" value={`- ${formatCurrency(feeAmount)}`} valueColor={colors.text.muted} />
              )}
              <DetailLine label="Date" value={dateStr} subValue={timeStr} />
            </Box>

            {/* Total - Hero Block */}
            <Box style={styles.totalBlock}>
              <Text variant="caption" color={colors.text.muted} weight="700" style={{ letterSpacing: 1.5 }}>
                {isBuy ? 'TOTAL COST' : 'NET PROCEEDS'}
              </Text>
              <Animated.View entering={FadeIn.delay(200)}>
                <Text variant="h1" weight="700" style={{ fontSize: 34, letterSpacing: -1.5, marginTop: 6 }}>
                  {formatCurrency(total)}
                </Text>
              </Animated.View>
            </Box>

            {/* Note */}
            {data.note.trim() !== '' && (
              <Box style={styles.noteBlock}>
                <Text variant="caption" color={colors.text.muted} weight="600" style={{ marginBottom: 4 }}>NOTE</Text>
                <Text variant="body" color={colors.text.secondary} style={{ lineHeight: 22 }}>{data.note}</Text>
              </Box>
            )}

            {/* Error Message */}
            {error && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Box row align="center" style={styles.errorBlock}>
                  <AlertTriangle color={colors.sentiment.bear_red} size={16} />
                  <Text variant="caption" color={colors.sentiment.bear_red} weight="600" style={{ marginLeft: spacing.xs, flex: 1 }}>
                    {error}
                  </Text>
                </Box>
              </Animated.View>
            )}

            {/* Security Badge */}
            <Box row align="center" style={styles.securityBadge}>
              <Shield color={colors.accent.premium_gold} size={14} />
              <Text variant="caption" color={colors.text.muted} style={{ marginLeft: 6, fontSize: 11 }}>
                Encrypted & secured transaction
              </Text>
            </Box>

            {/* Actions */}
            <Box row style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Pressable
                onPress={onCancel}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  { flex: 1, opacity: pressed ? 0.7 : isSubmitting ? 0.5 : 1 },
                ]}
              >
                <Box center padding={spacing.md} radius={radius.pill} style={styles.cancelBtn}>
                  <Text variant="h3" weight="600" color={colors.text.secondary}>Edit</Text>
                </Box>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  { flex: 2, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={isBuy
                    ? ['rgba(59,217,132,0.95)', 'rgba(40,180,110,0.95)']
                    : ['rgba(255,92,92,0.95)', 'rgba(200,60,60,0.95)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmBtn}
                >
                  {isSubmitting ? (
                    <Box row center>
                      <ActivityIndicator color={colors.background.base} size="small" />
                      <Text variant="h3" weight="700" color={colors.background.base} style={{ marginLeft: spacing.sm }}>
                        Processing...
                      </Text>
                    </Box>
                  ) : (
                    <Box row center>
                      <Check color={colors.background.base} size={20} style={{ marginRight: spacing.xs }} />
                      <Text variant="h3" weight="700" color={colors.background.base}>
                        Confirm & Submit
                      </Text>
                    </Box>
                  )}
                </LinearGradient>
              </Pressable>
            </Box>

          </PremiumCard>
        </Animated.View>
      </Box>
    </Modal>
  );
};

// ── Sub Components ──
const DetailLine: React.FC<{
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
}> = ({ label, value, subValue, valueColor }) => (
  <Box row justify="space-between" align="center" style={{ paddingVertical: 11 }}>
    <Text variant="body" color={colors.text.muted}>{label}</Text>
    <Box align="flex-end">
      <Text variant="body" weight="600" color={valueColor || colors.text.primary}>{value}</Text>
      {subValue && <Text variant="caption" color={colors.text.muted} style={{ marginTop: 1, fontSize: 11 }}>{subValue}</Text>}
    </Box>
  </Box>
);

const styles = StyleSheet.create({
  typeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  detailBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    marginBottom: spacing.md,
  },
  totalBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: radius.md,
  },
  noteBlock: {
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  securityBadge: {
    paddingVertical: spacing.sm,
  },
  errorBlock: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(255,92,92,0.1)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,92,92,0.15)',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  confirmBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
