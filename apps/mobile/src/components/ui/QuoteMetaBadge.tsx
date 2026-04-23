import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Info, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Box } from './Box';
import { Text } from './Text';
import { colors, spacing, radius } from '../../theme';
import { formatQuoteSourceLabel, formatQuoteTime } from '../../utils/quoteLabels';

interface QuoteMetaBadgeProps {
  symbol: string;
  source?: string;
  updatedAt?: string;
  isStale?: boolean;
  isConnected?: boolean;
  compact?: boolean;
}

export const QuoteMetaBadge: React.FC<QuoteMetaBadgeProps> = ({
  symbol,
  source,
  updatedAt,
  isStale,
  isConnected = true,
  compact = true,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const providerLabel = formatQuoteSourceLabel(source);
  const updatedLabel = formatQuoteTime(updatedAt);
  // Only treat the pill as "cached/stale" when the data itself is actually old.
  // A missing realtime WebSocket shouldn't make every REST-fed quote look broken.
  const showCached = Boolean(isStale);

  const statusLabel = isStale
    ? t('quoteMeta.statusStale', 'Stale')
    : !isConnected
      ? t('quoteMeta.statusCached', 'Cached')
      : t('quoteMeta.statusLive', 'Live');

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('quoteMeta.a11yOpen', 'Show data source and last update time')}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
      >
        <Box
          row
          align="center"
          style={[
            styles.pill,
            showCached ? styles.pillCached : styles.pillLive,
          ]}
        >
          <Info
            color={showCached ? colors.sentiment.bear_red : colors.text.muted}
            size={11}
            style={{ marginRight: 4 }}
          />
          <Text
            variant="caption"
            weight="600"
            color={showCached ? colors.sentiment.bear_red : colors.text.muted}
            style={{ fontSize: 10 }}
          >
            {compact ? providerLabel : `${providerLabel} · ${statusLabel}`}
          </Text>
        </Box>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Pressable onPress={() => {}} style={{ width: '84%', maxWidth: 420, overflow: 'hidden', borderRadius: 18 }}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill as never} />
            <Box
              style={{
                backgroundColor: 'rgba(17,19,26,0.86)',
                padding: spacing.lg,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Box row justify="space-between" align="center" style={{ marginBottom: spacing.md }}>
                <Text variant="h3" weight="700">
                  {t('quoteMeta.title', 'Data source')}
                </Text>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <X color={colors.text.muted} size={18} />
                </Pressable>
              </Box>

              <MetaRow label={t('quoteMeta.symbol', 'Symbol')} value={symbol} />
              <MetaRow label={t('quoteMeta.provider', 'Provider')} value={providerLabel} />
              <MetaRow label={t('quoteMeta.updated', 'Last update')} value={updatedLabel} />
              <MetaRow
                label={t('quoteMeta.status', 'Status')}
                value={statusLabel}
                valueColor={
                  showCached
                    ? colors.sentiment.bear_red
                    : !isConnected
                      ? colors.text.secondary
                      : colors.sentiment.bull_green
                }
              />

              <Text
                variant="caption"
                color={colors.text.muted}
                style={{ marginTop: spacing.md, lineHeight: 18 }}
              >
                {t(
                  'quoteMeta.disclaimer',
                  'Prices are aggregated from third-party providers and shown for informational purposes only. Not investment advice.',
                )}
              </Text>
            </Box>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const MetaRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <Box row justify="space-between" align="center" style={{ marginBottom: 8 }}>
    <Text variant="caption" color={colors.text.muted}>
      {label}
    </Text>
    <Text variant="caption" weight="600" color={valueColor || colors.text.primary} style={{ maxWidth: '60%' }} numberOfLines={2}>
      {value}
    </Text>
  </Box>
);

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillLive: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillCached: {
    backgroundColor: 'rgba(255,92,92,0.08)',
    borderColor: 'rgba(255,92,92,0.2)',
  },
});
