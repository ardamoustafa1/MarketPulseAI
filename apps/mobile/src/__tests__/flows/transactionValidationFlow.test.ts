import {
  INITIAL_FORM,
  buildTransactionPayload,
  computeTotal,
  sanitizeDecimalInput,
  validateForm,
} from '../../utils/transactionValidation';

describe('transaction validation flow', () => {
  it('sanitizes malformed decimal input', () => {
    expect(sanitizeDecimalInput('00abc12..34')).toBe('12.34');
  });

  it('returns validation errors for sell edge cases', () => {
    const form = {
      ...INITIAL_FORM,
      assetId: 'asset-1',
      type: 'sell' as const,
      quantity: '12',
      unitPrice: '100',
      fee: '1200',
      date: new Date(),
    };

    const errors = validateForm(form, 10);

    expect(errors.quantity).toContain('Insufficient balance');
    expect(errors.fee).toContain('Fee cannot exceed or equal sale proceeds');
  });

  it('computes totals and builds payload for valid buy flow', () => {
    const form = {
      ...INITIAL_FORM,
      assetId: '9f6d2d5e-4b29-4d2a-9f5a-0b6b7c8d9e10',
      assetSymbol: 'BTC',
      type: 'buy' as const,
      quantity: '1.25',
      unitPrice: '40000',
      fee: '25',
      note: 'Long term',
      date: new Date('2026-01-01T10:00:00.000Z'),
    };

    const totals = computeTotal(form);
    const payload = buildTransactionPayload(form);

    expect(totals.subtotal).toBe(50000);
    expect(totals.total).toBe(50025);
    expect(payload.asset_id).toBe('9f6d2d5e-4b29-4d2a-9f5a-0b6b7c8d9e10');
    expect(payload.asset_symbol).toBe('BTC');
    expect(payload.notes).toBe('Long term');
    expect(payload.transaction_date).toBe('2026-01-01T10:00:00.000Z');
  });
});
