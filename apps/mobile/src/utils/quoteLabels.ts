/** Human-readable provider names for quote transparency */

export function formatQuoteSourceLabel(raw: string | undefined): string {
  const s = (raw ?? 'unknown').toLowerCase();
  if (s.startsWith('derived')) return 'Derived';
  const map: Record<string, string> = {
    binance: 'Binance',
    yahoo: 'Yahoo Finance',
    harem: 'Harem / Altın API',
    stooq: 'Stooq',
    aggregator: 'Aggregator',
  };
  for (const [k, v] of Object.entries(map)) {
    if (s.includes(k)) return v;
  }
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Unknown';
}

export function formatQuoteTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
