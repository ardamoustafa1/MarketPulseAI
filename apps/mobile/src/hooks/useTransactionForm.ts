import { useState, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  TransactionFormData,
  TransactionType,
  ValidationErrors,
  INITIAL_FORM,
  validateForm,
  validateField,
  computeTotal,
  sanitizeDecimalInput,
} from '../utils/transactionValidation';
import { usePortfolioStore } from '../store/usePortfolioStore';

export interface UseTransactionFormReturn {
  form: TransactionFormData;
  errors: ValidationErrors;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isValid: boolean;
  total: ReturnType<typeof computeTotal>;
  
  // Field mutations
  updateField: (field: keyof TransactionFormData, value: any) => void;
  updateDecimalField: (field: 'quantity' | 'unitPrice' | 'fee', value: string) => void;
  markTouched: (field: string) => void;
  setType: (type: TransactionType) => void;
  selectAsset: (id: string, symbol: string, name: string) => void;
  setDate: (date: Date) => void;
  
  // Form lifecycle
  validateAll: () => boolean;
  reset: () => void;
  getVisibleError: (field: string) => string | undefined;
}

/**
 * Custom hook that encapsulates all transaction form logic —
 * field state, validation, touched tracking, and computed values.
 */
export function useTransactionForm(): UseTransactionFormReturn {
  const [form, setForm] = useState<TransactionFormData>({ ...INITIAL_FORM });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const initialFormRef = useRef<TransactionFormData>({ ...INITIAL_FORM });

  // ── Computed Values ──
  const total = useMemo(
    () => computeTotal(form),
    // `computeTotal` only reads the four fields below. Depending on `form` as a
    // whole would invalidate the memo on every keystroke to unrelated fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.quantity, form.unitPrice, form.fee, form.type],
  );
  
  const isDirty = useMemo(() => {
    const init = initialFormRef.current;
    return (
      form.assetId !== init.assetId ||
      form.type !== init.type ||
      form.quantity !== init.quantity ||
      form.unitPrice !== init.unitPrice ||
      form.fee !== init.fee ||
      form.note !== init.note
    );
  }, [form]);

  // Derive available quantity for validations
  const positions = usePortfolioStore(state => state.positions);
  const availableQty = useMemo(() => {
    const normalizedAssetId = form.assetId.trim().toLowerCase();
    const normalizedAssetSymbol = form.assetSymbol.trim().toLowerCase();
    const pos = positions.find(p => {
      const idMatch = p.id.trim().toLowerCase() === normalizedAssetId;
      const symbolMatch = p.symbol.trim().toLowerCase() === normalizedAssetSymbol;
      return idMatch || symbolMatch;
    });
    return pos ? parseFloat(pos.quantity) : 0;
  }, [positions, form.assetId, form.assetSymbol]);

  const isValid = useMemo(() => {
    const validationErrors = validateForm(form, availableQty);
    return Object.keys(validationErrors).length === 0;
  }, [form, availableQty]);

  // ── Field Update Helper ──
  const updateField = useCallback((field: keyof TransactionFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    setErrors(prev => {
      if (prev[field as keyof ValidationErrors]) {
        const next = { ...prev };
        delete next[field as keyof ValidationErrors];
        return next;
      }
      return prev;
    });
  }, []);

  // Specialized handler for decimal inputs with sanitization
  const updateDecimalField = useCallback((field: 'quantity' | 'unitPrice' | 'fee', value: string) => {
    const sanitized = sanitizeDecimalInput(value);
    updateField(field, sanitized);
  }, [updateField]);

  const markTouched = useCallback((field: string) => {
    setTouched(prev => {
      if (prev[field]) return prev; // No-op if already touched
      return { ...prev, [field]: true };
    });
    // Run inline validation on blur
    setErrors(prev => {
      const fieldError = validateField(field as keyof TransactionFormData, form, availableQty);
      if (fieldError) {
        return { ...prev, [field]: fieldError };
      }
      const next = { ...prev };
      delete next[field as keyof ValidationErrors];
      return next;
    });
  }, [form, availableQty]);

  // ── Type Toggle ──
  const setType = useCallback((type: TransactionType) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateField('type', type);
  }, [updateField]);

  // ── Asset Selection ──
  const selectAsset = useCallback((id: string, symbol: string, name: string) => {
    setForm(prev => ({ ...prev, assetId: id, assetSymbol: symbol, assetName: name }));
    setErrors(prev => {
      const next = { ...prev };
      delete next.assetId;
      return next;
    });
  }, []);

  // ── Date ──
  const setDate = useCallback((date: Date) => {
    updateField('date', date);
  }, [updateField]);

  // ── Full Validation ──
  const validateAll = useCallback((): boolean => {
    const validationErrors = validateForm(form, availableQty);
    setErrors(validationErrors);
    // Mark all fields as touched so errors display
    setTouched({
      assetId: true,
      quantity: true,
      unitPrice: true,
      fee: true,
      date: true,
      note: true,
    });

    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    return !hasErrors;
  }, [form, availableQty]);

  // ── Reset ──
  const reset = useCallback(() => {
    setForm({ ...INITIAL_FORM, date: new Date() });
    setErrors({});
    setTouched({});
  }, []);

  // ── Only show error if field is touched ──
  const getVisibleError = useCallback((field: string): string | undefined => {
    return touched[field] ? errors[field as keyof ValidationErrors] : undefined;
  }, [touched, errors]);

  return {
    form,
    errors,
    touched,
    isDirty,
    isValid,
    total,
    updateField,
    updateDecimalField,
    markTouched,
    setType,
    selectAsset,
    setDate,
    validateAll,
    reset,
    getVisibleError,
  };
}
