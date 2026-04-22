import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable, Platform, Modal, TextInput, Keyboard, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { AssetPickerSheet, AssetItem } from '../transaction/AssetPickerSheet';
import { useAlertStore, AlertCondition } from '../../store/useAlertStore';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { colors, radius, spacing } from '../../theme';
import { X, Search, BellRing, Target, Percent, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react-native';

interface CreateAlertSheetProps {
  visible: boolean;
  onClose: () => void;
  initialAsset?: AssetItem;
}

export const CreateAlertSheet: React.FC<CreateAlertSheetProps> = ({
  visible, onClose, initialAsset
}) => {
  const insets = useSafeAreaInsets();
  const { createAlert, isLoading } = useAlertStore();
  const getQuote = useMarketDataStore((state) => state.getQuote);

  const [asset, setAsset] = useState<AssetItem | undefined>(initialAsset);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  
  const [mode, setMode] = useState<'price' | 'percentage'>('price');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [value, setValue] = useState('');

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    setTimeout(() => {
      setAsset(initialAsset);
      setMode('price');
      setDirection('up');
      setValue('');
    }, 300);
  }, [onClose, initialAsset]);

  const handleSubmit = useCallback(async () => {
    if (!asset || !value || isNaN(Number(value))) return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    let condition: AlertCondition;
    if (mode === 'price') {
      condition = direction === 'up' ? 'gt' : 'lt';
    } else {
      condition = direction === 'up' ? 'pct_up' : 'pct_down';
    }

    const selectedQuote = getQuote(asset.symbol);
    const payload = {
      asset_id: asset.id,
      target_price: value,
      condition,
      base_price: mode === 'percentage' && selectedQuote ? String(selectedQuote.price) : null,
    };

    const success = await createAlert(payload);
    if (success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } else {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [asset, value, mode, direction, createAlert, getQuote, handleClose]);

  const isValid = asset && value && !isNaN(Number(value)) && Number(value) > 0;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
        <Box flex={1} style={styles.overlay}>
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} />
          
          <Animated.View
            entering={FadeInDown.springify().damping(20)}
            style={[styles.sheetBody, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            {/* Header */}
            <Box row justify="space-between" align="center" style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
              <Box row align="center">
                <Box center style={[styles.iconBadge, { backgroundColor: 'rgba(200,169,126,0.1)' }]}>
                  <BellRing color={colors.accent.premium_gold} size={20} />
                </Box>
                <Text variant="h2" weight="700" style={{ marginLeft: spacing.sm, letterSpacing: -0.5 }}>Create Alert</Text>
              </Box>
              <Pressable onPress={handleClose} hitSlop={15}>
                <Box center style={styles.closeBtn}>
                  <X color={colors.text.secondary} size={18} />
                </Box>
              </Pressable>
            </Box>

            <Box padding={spacing.lg}>
              {/* Asset Selector */}
              <Text variant="caption" weight="600" color={colors.text.muted} style={{ marginBottom: spacing.xs, marginLeft: 4 }}>ASSET</Text>
              <Pressable onPress={() => setShowAssetPicker(true)}>
                <Box row justify="space-between" align="center" style={styles.inputContainer}>
                  {asset ? (
                    <Box row align="center">
                      <Text variant="body" weight="600">{asset.symbol}</Text>
                      <Text variant="caption" color={colors.text.muted} style={{ marginLeft: spacing.sm }}>{asset.name}</Text>
                    </Box>
                  ) : (
                    <Text variant="body" color={colors.text.muted}>Select an asset...</Text>
                  )}
                  <ChevronDown color={colors.text.muted} size={20} />
                </Box>
              </Pressable>

              {/* Mode Toggle */}
              <Box row style={[styles.toggleContainer, { marginTop: spacing.lg }]}>
                <Pressable style={{ flex: 1 }} onPress={() => setMode('price')}>
                  <Box center style={[styles.toggleBtn, mode === 'price' && styles.toggleBtnActive]}>
                    <Target color={mode === 'price' ? colors.text.primary : colors.text.muted} size={16} />
                    <Text variant="caption" weight="600" color={mode === 'price' ? colors.text.primary : colors.text.muted} style={{ marginLeft: 6 }}>Target Price</Text>
                  </Box>
                </Pressable>
                <Pressable style={{ flex: 1 }} onPress={() => setMode('percentage')}>
                  <Box center style={[styles.toggleBtn, mode === 'percentage' && styles.toggleBtnActive]}>
                    <Percent color={mode === 'percentage' ? colors.text.primary : colors.text.muted} size={16} />
                    <Text variant="caption" weight="600" color={mode === 'percentage' ? colors.text.primary : colors.text.muted} style={{ marginLeft: 6 }}>Percentage</Text>
                  </Box>
                </Pressable>
              </Box>

              {/* Direction & Input */}
              <Box row style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <Box style={{ flex: 0.4 }}>
                  <Pressable onPress={() => setDirection(d => d === 'up' ? 'down' : 'up')}>
                    <Box row justify="center" align="center" style={[styles.inputContainer, { borderColor: direction === 'up' ? 'rgba(59,217,132,0.3)' : 'rgba(255,92,92,0.3)' }]}>
                      {direction === 'up' 
                        ? <ArrowUpRight color={colors.sentiment.bull_green} size={20} />
                        : <ArrowDownRight color={colors.sentiment.bear_red} size={20} />
                      }
                      <Text variant="body" weight="600" style={{ marginLeft: 6 }}>
                        {direction === 'up' ? (mode === 'price' ? '>=' : '+%') : (mode === 'price' ? '<=' : '-%')}
                      </Text>
                    </Box>
                  </Pressable>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Box row align="center" style={styles.inputContainer}>
                    {mode === 'price' && <Text variant="body" color={colors.text.muted} style={{ marginRight: 4 }}>$</Text>}
                    <TextInput
                      style={styles.textInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="decimal-pad"
                      value={value}
                      onChangeText={v => setValue(v.replace(/[^0-9.]/g, ''))}
                    />
                    {mode === 'percentage' && <Text variant="body" color={colors.text.muted} style={{ marginLeft: 4 }}>%</Text>}
                  </Box>
                </Box>
              </Box>

              {/* Submit */}
              <Pressable onPress={handleSubmit} disabled={!isValid || isLoading} style={{ marginTop: spacing.xl }}>
                <LinearGradient
                  colors={isValid 
                    ? ['rgba(245,245,245,1)', 'rgba(220,220,220,1)']
                    : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.submitBtn}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background.base} size="small" />
                  ) : (
                    <Text variant="h3" weight="700" color={isValid ? colors.background.base : colors.text.muted}>
                      Set Alert
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

            </Box>
          </Animated.View>
        </Box>
      </Modal>

      <AssetPickerSheet 
        visible={showAssetPicker}
        selectedId={asset?.id}
        onSelect={(a) => { setAsset(a); setShowAssetPicker(false); }}
        onClose={() => setShowAssetPicker(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetBody: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  textInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
  },
  toggleContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.md,
    padding: 4,
  },
  toggleBtn: {
    flexDirection: 'row',
    height: 40,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitBtn: {
    height: 56,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
