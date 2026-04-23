/**
 * MarketPulse AI — Transaction Form Validation
 * 
 * Pure logic module. No UI dependencies.
 * All monetary inputs arrive as strings to avoid floating-point corruption.
 */

export type TransactionType = 'buy' | 'sell';

export interface TransactionFormData {
  assetId: string;
  assetSymbol: string;
  assetName: string;
  type: TransactionType;
  quantity: string;
  unitPrice: string;
  fee: string;
  note: string;
  date: Date;
}

export interface ValidationErrors {
  assetId?: string;
  quantity?: string;
  unitPrice?: string;
  fee?: string;
  date?: string;
  note?: string;
  general?: string;
}

export const INITIAL_FORM: TransactionFormData = {
  assetId: '',
  assetSymbol: '',
  assetName: '',
  type: 'buy',
  quantity: '',
  unitPrice: '',
  fee: '',
  note: '',
  date: new Date(),
};

// ── Constants ──
const MAX_QUANTITY_DECIMALS = 8;
const MAX_PRICE_DECIMALS = 8;
const MAX_FEE_DECIMALS = 2;
const MAX_NOTE_LENGTH = 500;
const MAX_QUANTITY_VALUE = 999_999_999;
const MAX_PRICE_VALUE = 999_999_999;
const MAX_FEE_VALUE = 999_999;

/**
 * Sanitizes a decimal string input: removes leading zeros, blocks multiple dots, etc.
 */
export function sanitizeDecimalInput(raw: string): string {
  // Remove anything that isn't a digit or period
  let cleaned = raw.replace(/[^0-9.]/g, '');
  
  // Prevent multiple dots
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Remove leading zeros (but keep "0." for decimals)
  if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned === '' || cleaned[0] === '.') cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validates the transaction form and returns an error map.
 * An empty object means the form is valid.
 */
export function validateForm(data: TransactionFormData, availableQty?: number): ValidationErrors {
  const errors: ValidationErrors = {};

  // ── Asset ──
  if (!data.assetId) {
    errors.assetId = 'Please select an asset.';
  }

  // ── Quantity ──
  if (!data.quantity || data.quantity.trim() === '') {
    errors.quantity = 'Quantity is required.';
  } else {
    const q = parseFloat(data.quantity);
    if (isNaN(q)) {
      errors.quantity = 'Enter a valid number.';
    } else if (q <= 0) {
      errors.quantity = 'Must be greater than zero.';
    } else if (q > MAX_QUANTITY_VALUE) {
      errors.quantity = `Maximum ${MAX_QUANTITY_VALUE.toLocaleString()}.`;
    } else {
      const decimalPart = data.quantity.split('.')[1];
      if (decimalPart && decimalPart.length > MAX_QUANTITY_DECIMALS) {
        errors.quantity = `Max ${MAX_QUANTITY_DECIMALS} decimal places.`;
      }
      
      // -- Insufficient Balance Check for Sells --
      if (data.type === 'sell' && availableQty !== undefined) {
        if (q > availableQty) {
          errors.quantity = `Insufficient balance. Max: ${availableQty.toLocaleString()}`;
        }
      }
    }
  }

  // ── Unit Price ──
  if (!data.unitPrice || data.unitPrice.trim() === '') {
    errors.unitPrice = 'Unit price is required.';
  } else {
    const p = parseFloat(data.unitPrice);
    if (isNaN(p)) {
      errors.unitPrice = 'Enter a valid price.';
    } else if (p <= 0) {
      errors.unitPrice = 'Must be greater than zero.';
    } else if (p > MAX_PRICE_VALUE) {
      errors.unitPrice = `Maximum $${MAX_PRICE_VALUE.toLocaleString()}.`;
    } else {
      const decimalPart = data.unitPrice.split('.')[1];
      if (decimalPart && decimalPart.length > MAX_PRICE_DECIMALS) {
        errors.unitPrice = `Max ${MAX_PRICE_DECIMALS} decimal places.`;
      }
    }
  }

  // ── Fee (optional but if provided, must be valid) ──
  if (data.fee && data.fee.trim() !== '') {
    const f = parseFloat(data.fee);
    if (isNaN(f)) {
      errors.fee = 'Enter a valid fee amount.';
    } else if (f < 0) {
      errors.fee = 'Fee cannot be negative.';
    } else if (f > MAX_FEE_VALUE) {
      errors.fee = `Maximum $${MAX_FEE_VALUE.toLocaleString()}.`;
    } else {
      const decimalPart = data.fee.split('.')[1];
      if (decimalPart && decimalPart.length > MAX_FEE_DECIMALS) {
        errors.fee = 'Max 2 decimal places for fees.';
      }
      
      // -- Fee exceeds subtotal for sells --
      if (data.type === 'sell' && data.unitPrice && data.quantity) {
        const subtotal = parseFloat(data.quantity) * parseFloat(data.unitPrice);
        if (!isNaN(subtotal) && f >= subtotal) {
          errors.fee = 'Fee cannot exceed or equal sale proceeds.';
        }
      }
    }
  }

  // ── Date ──
  if (!data.date || isNaN(data.date.getTime())) {
    errors.date = 'Please select a valid date.';
  } else {
    const now = new Date();
    // Allow up to end of today (add 1 day buffer for timezone differences)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (data.date > tomorrow) {
      errors.date = 'Date cannot be in the future.';
    }
  }

  // ── Note ──
  if (data.note && data.note.length > MAX_NOTE_LENGTH) {
    errors.note = `Max ${MAX_NOTE_LENGTH} characters.`;
  }

  return errors;
}

/**
 * Validates a single field — useful for live inline validation on blur.
 */
export function validateField(field: keyof TransactionFormData, data: TransactionFormData, availableQty?: number): string | undefined {
  const allErrors = validateForm(data, availableQty);
  return allErrors[field as keyof ValidationErrors];
}

/**
 * Computes the total cost/proceeds of a transaction for the confirmation screen.
 */
export function computeTotal(data: TransactionFormData): {
  subtotal: number;
  feeAmount: number;
  total: number;
} {
  const qty = parseFloat(data.quantity) || 0;
  const price = parseFloat(data.unitPrice) || 0;
  const fee = parseFloat(data.fee) || 0;
  const subtotal = qty * price;
  
  return {
    subtotal: Number(subtotal.toFixed(8)),
    feeAmount: Number(fee.toFixed(2)),
    total: data.type === 'buy' 
      ? Number((subtotal + fee).toFixed(8)) 
      : Number((subtotal - fee).toFixed(8)),
  };
}

/**
 * Builds the API request payload from the form data.
 * Maps frontend field names to backend snake_case contract.
 */
export function buildTransactionPayload(data: TransactionFormData) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    data.assetId
  );
  return {
    asset_id: isUuid ? data.assetId : null,
    asset_symbol: data.assetSymbol,
    type: data.type,
    quantity: data.quantity,
    price: data.unitPrice,
    fee: data.fee || '0',
    notes: data.note || null,
    transaction_date: data.date.toISOString(),
  };
}
