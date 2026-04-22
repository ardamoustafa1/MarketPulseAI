import i18n from '../i18n';

type CurrencyCode = 'USD' | 'EUR' | 'TRY';

function resolveLocale(): string {
  return i18n.language === 'tr' ? 'tr-TR' : 'en-US';
}

export function formatCurrencyByLocale(
  value: string | number | null | undefined,
  currency: CurrencyCode = 'USD',
  maximumFractionDigits = 2
): string {
  const parsed = typeof value === 'string' ? Number(value) : Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return currency === 'TRY' ? '0,00 TL' : `${currency} 0.00`;
  }
  return new Intl.NumberFormat(resolveLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(parsed);
}

export function formatNumberByLocale(
  value: string | number | null | undefined,
  maximumFractionDigits = 4
): string {
  const parsed = typeof value === 'string' ? Number(value) : Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return '0';
  }
  return new Intl.NumberFormat(resolveLocale(), {
    maximumFractionDigits,
  }).format(parsed);
}

export function formatDateTimeByLocale(date: Date): { date: string; time: string } {
  const locale = resolveLocale();
  return {
    date: date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}
