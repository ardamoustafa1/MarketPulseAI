import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import { wsClient } from '../ws/client';

const QUOTE_CACHE_KEY = 'market_quotes_cache_v1';
const QUOTE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

let lastPersistAt = 0;
function persistQuotes(quotes: Record<string, MarketQuote>) {
  const now = Date.now();
  if (now - lastPersistAt < 5_000) return; // throttle writes
  lastPersistAt = now;
  try {
    const payload = JSON.stringify({ at: now, quotes });
    SecureStore.setItemAsync(QUOTE_CACHE_KEY, payload).catch(() => {});
  } catch {
    /* noop */
  }
}

async function restoreCachedQuotes(): Promise<Record<string, MarketQuote> | null> {
  try {
    const raw = await SecureStore.getItemAsync(QUOTE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; quotes?: Record<string, MarketQuote> };
    if (!parsed?.quotes) return null;
    if (parsed.at && Date.now() - parsed.at > QUOTE_CACHE_MAX_AGE_MS) return null;
    return parsed.quotes;
  } catch {
    return null;
  }
}

export type AssetCategory = 'crypto' | 'forex' | 'metals';

type AssetMeta = {
  symbol: string;
  name: string;
  category: AssetCategory;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  changePercent: number;
  source: string;
  isStale: boolean;
  updatedAt: string;
};

type PricePayload = {
  symbol: string;
  price: string | number;
  change_24h?: string | number | null;
  source?: string;
  is_stale?: boolean;
  last_updated_at?: string;
};

type WsEnvelope = {
  event?: string;
  payload?: PricePayload;
};

const ASSET_CATALOG: AssetMeta[] = [
  { symbol: 'BTC', name: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', category: 'crypto' },
  { symbol: 'SOL', name: 'Solana', category: 'crypto' },
  { symbol: 'ADA', name: 'Cardano', category: 'crypto' },
  { symbol: 'XRP', name: 'Ripple', category: 'crypto' },
  { symbol: 'BNB', name: 'BNB', category: 'crypto' },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'crypto' },
  { symbol: 'TRX', name: 'TRON', category: 'crypto' },
  { symbol: 'DOT', name: 'Polkadot', category: 'crypto' },
  { symbol: 'MATIC', name: 'Polygon', category: 'crypto' },
  { symbol: 'AVAX', name: 'Avalanche', category: 'crypto' },
  { symbol: 'LINK', name: 'Chainlink', category: 'crypto' },
  { symbol: 'LTC', name: 'Litecoin', category: 'crypto' },
  { symbol: 'BCH', name: 'Bitcoin Cash', category: 'crypto' },
  { symbol: 'ATOM', name: 'Cosmos', category: 'crypto' },
  { symbol: 'ETC', name: 'Ethereum Classic', category: 'crypto' },
  { symbol: 'XLM', name: 'Stellar', category: 'crypto' },
  { symbol: 'XMR', name: 'Monero', category: 'crypto' },
  { symbol: 'FIL', name: 'Filecoin', category: 'crypto' },
  { symbol: 'APT', name: 'Aptos', category: 'crypto' },
  { symbol: 'ARB', name: 'Arbitrum', category: 'crypto' },
  { symbol: 'OP', name: 'Optimism', category: 'crypto' },
  { symbol: 'HBAR', name: 'Hedera', category: 'crypto' },
  { symbol: 'VET', name: 'VeChain', category: 'crypto' },
  { symbol: 'NEAR', name: 'NEAR Protocol', category: 'crypto' },
  { symbol: 'ALGO', name: 'Algorand', category: 'crypto' },
  { symbol: 'ICP', name: 'Internet Computer', category: 'crypto' },
  { symbol: 'AAVE', name: 'Aave', category: 'crypto' },
  { symbol: 'SAND', name: 'The Sandbox', category: 'crypto' },
  { symbol: 'MANA', name: 'Decentraland', category: 'crypto' },
  { symbol: 'USDTRY', name: 'US Dollar / Turkish Lira', category: 'forex' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex' },
  { symbol: 'GBPUSD', name: 'Pound / US Dollar', category: 'forex' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'forex' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'forex' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'forex' },
  { symbol: 'USDAUD', name: 'US Dollar / Australian Dollar', category: 'forex' },
  { symbol: 'USDNZD', name: 'US Dollar / New Zealand Dollar', category: 'forex' },
  { symbol: 'USDSEK', name: 'US Dollar / Swedish Krona', category: 'forex' },
  { symbol: 'USDNOK', name: 'US Dollar / Norwegian Krone', category: 'forex' },
  { symbol: 'USDDKK', name: 'US Dollar / Danish Krone', category: 'forex' },
  { symbol: 'USDCNH', name: 'US Dollar / Chinese Yuan Offshore', category: 'forex' },
  { symbol: 'USDRUB', name: 'US Dollar / Russian Ruble', category: 'forex' },
  { symbol: 'USDZAR', name: 'US Dollar / South African Rand', category: 'forex' },
  { symbol: 'USDMXN', name: 'US Dollar / Mexican Peso', category: 'forex' },
  { symbol: 'USDBRL', name: 'US Dollar / Brazilian Real', category: 'forex' },
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', category: 'forex' },
  { symbol: 'USDKRW', name: 'US Dollar / South Korean Won', category: 'forex' },
  { symbol: 'USDHKD', name: 'US Dollar / Hong Kong Dollar', category: 'forex' },
  { symbol: 'USDSGD', name: 'US Dollar / Singapore Dollar', category: 'forex' },
  { symbol: 'USDPLN', name: 'US Dollar / Polish Zloty', category: 'forex' },
  { symbol: 'USDCZK', name: 'US Dollar / Czech Koruna', category: 'forex' },
  { symbol: 'USDHUF', name: 'US Dollar / Hungarian Forint', category: 'forex' },
  { symbol: 'USDILS', name: 'US Dollar / Israeli Shekel', category: 'forex' },
  { symbol: 'USDAED', name: 'US Dollar / UAE Dirham', category: 'forex' },
  { symbol: 'USDSAR', name: 'US Dollar / Saudi Riyal', category: 'forex' },
  { symbol: 'USDQAR', name: 'US Dollar / Qatari Riyal', category: 'forex' },
  { symbol: 'USDKWD', name: 'US Dollar / Kuwaiti Dinar', category: 'forex' },
  { symbol: 'USDBHD', name: 'US Dollar / Bahraini Dinar', category: 'forex' },
  { symbol: 'USDOMR', name: 'US Dollar / Omani Rial', category: 'forex' },
  { symbol: 'USDTHB', name: 'US Dollar / Thai Baht', category: 'forex' },
  { symbol: 'USDMYR', name: 'US Dollar / Malaysian Ringgit', category: 'forex' },
  { symbol: 'USDIDR', name: 'US Dollar / Indonesian Rupiah', category: 'forex' },
  { symbol: 'USDPHP', name: 'US Dollar / Philippine Peso', category: 'forex' },
  { symbol: 'USDVND', name: 'US Dollar / Vietnamese Dong', category: 'forex' },
  { symbol: 'XAU', name: 'Gold', category: 'metals' },
  { symbol: 'XAG', name: 'Silver', category: 'metals' },
  { symbol: 'XPT', name: 'Platinum Ounce', category: 'metals' },
  { symbol: 'XPD', name: 'Palladium Ounce', category: 'metals' },
  { symbol: 'HASALTIN', name: 'Has Altin', category: 'metals' },
  { symbol: 'ONS', name: 'Ons Altin', category: 'metals' },
  { symbol: 'USDKG', name: 'USD / KG', category: 'metals' },
  { symbol: 'EURKG', name: 'EUR / KG', category: 'metals' },
  { symbol: 'AYAR22', name: '22 Ayar', category: 'metals' },
  { symbol: 'GRAMALTIN', name: 'Gram Altin', category: 'metals' },
  { symbol: 'ALTINGUMUS', name: 'Altin Gumus', category: 'metals' },
  { symbol: 'CEYREKYENI', name: 'Yeni Ceyrek', category: 'metals' },
  { symbol: 'CEYREKESKI', name: 'Eski Ceyrek', category: 'metals' },
  { symbol: 'YARIMYENI', name: 'Yeni Yarım', category: 'metals' },
  { symbol: 'YARIMESKI', name: 'Eski Yarım', category: 'metals' },
  { symbol: 'TAMYENI', name: 'Yeni Tam', category: 'metals' },
  { symbol: 'TAMESKI', name: 'Eski Tam', category: 'metals' },
  { symbol: 'ATAYENI', name: 'Yeni Ata', category: 'metals' },
  { symbol: 'ATAESKI', name: 'Eski Ata', category: 'metals' },
  { symbol: 'ATA5YENI', name: 'Yeni Ata5', category: 'metals' },
  { symbol: 'ATA5ESKI', name: 'Eski Ata5', category: 'metals' },
  { symbol: 'GREMSEYENI', name: 'Yeni Gremse', category: 'metals' },
  { symbol: 'GREMSEESKI', name: 'Eski Gremse', category: 'metals' },
  { symbol: 'AYAR14', name: '14 Ayar', category: 'metals' },
  { symbol: 'GUMUSTL', name: 'Gumus TL', category: 'metals' },
  { symbol: 'GUMUSONS', name: 'Gumus Ons', category: 'metals' },
  { symbol: 'GUMUSUSD', name: 'Gumus USD', category: 'metals' },
  { symbol: 'PLATINONS', name: 'Platin Ons', category: 'metals' },
  { symbol: 'PALADYUMONS', name: 'Paladyum Ons', category: 'metals' },
  { symbol: 'PLATINUSD', name: 'Platin / USD', category: 'metals' },
  { symbol: 'PALADYUMUSD', name: 'Paladyum / USD', category: 'metals' },
];

const ASSET_META_BY_SYMBOL = ASSET_CATALOG.reduce<Record<string, AssetMeta>>((acc, item) => {
  acc[item.symbol] = item;
  return acc;
}, {});
const PRICE_BATCH_SIZE = 20;

interface MarketDataState {
  quotes: Record<string, MarketQuote>;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  initialized: boolean;
  lastUpdatedAt: number | null;
  cacheHydrated: boolean;

  initializeRealtime: () => void;
  fetchQuotes: (symbols?: string[]) => Promise<void>;
  hydrateFromCache: () => Promise<void>;
  getAssetCatalog: () => AssetMeta[];
  getQuotesForCategory: (category: AssetCategory | 'favorites') => MarketQuote[];
  getQuote: (symbol: string) => MarketQuote | null;
  clearError: () => void;
  resetRealtime: () => void;
}

function toNumber(input: unknown): number {
  const parsed = typeof input === 'number' ? input : Number(input ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePricePayload(payload: PricePayload): MarketQuote | null {
  const symbol = payload.symbol?.toUpperCase();
  if (!symbol || !ASSET_META_BY_SYMBOL[symbol]) {
    return null;
  }

  const meta = ASSET_META_BY_SYMBOL[symbol];
  return {
    symbol,
    name: meta.name,
    category: meta.category,
    price: toNumber(payload.price),
    changePercent: toNumber(payload.change_24h),
    source: payload.source ?? 'unknown',
    isStale: Boolean(payload.is_stale),
    updatedAt: payload.last_updated_at ?? new Date().toISOString(),
  };
}

export const useMarketDataStore = create<MarketDataState>((set, get) => ({
  quotes: {},
  isLoading: false,
  error: null,
  isConnected: false,
  initialized: false,
  lastUpdatedAt: null,
  cacheHydrated: false,

  hydrateFromCache: async () => {
    if (get().cacheHydrated) return;
    const cached = await restoreCachedQuotes();
    if (cached && Object.keys(get().quotes).length === 0) {
      // Mark every cached quote as stale so the UI surfaces "Cached".
      const flagged: Record<string, MarketQuote> = {};
      for (const [sym, q] of Object.entries(cached)) {
        flagged[sym] = { ...q, isStale: true };
      }
      set({ quotes: flagged, cacheHydrated: true });
    } else {
      set({ cacheHydrated: true });
    }
  },

  initializeRealtime: () => {
    if (get().initialized) {
      return;
    }

    wsClient.onConnectionChange = (connected) => {
      set({ isConnected: connected });
    };

    wsClient.onMessage = (raw: WsEnvelope) => {
      if (raw?.event !== 'price_update' || !raw.payload) {
        return;
      }

      const normalized = normalizePricePayload(raw.payload);
      if (!normalized) {
        return;
      }

      const existing = get().quotes[normalized.symbol];
      if (
        existing &&
        existing.price === normalized.price &&
        existing.updatedAt === normalized.updatedAt &&
        existing.changePercent === normalized.changePercent
      ) {
        return;
      }

      set((state) => {
        const nextQuotes = {
          ...state.quotes,
          [normalized.symbol]: normalized,
        };
        persistQuotes(nextQuotes);
        return {
          quotes: nextQuotes,
          lastUpdatedAt: Date.now(),
        };
      });
    };

    wsClient.init();
    wsClient.connect();
    wsClient.subscribe(ASSET_CATALOG.map((asset) => asset.symbol));
    set({ initialized: true });
  },

  fetchQuotes: async (symbols = ASSET_CATALOG.map((asset) => asset.symbol)) => {
    if (symbols.length === 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      let hasAppliedAnyBatch = false;
      for (let i = 0; i < symbols.length; i += PRICE_BATCH_SIZE) {
        const batch = symbols.slice(i, i + PRICE_BATCH_SIZE);
        const response = await apiClient.get('/api/v1/prices', {
          params: { symbols: batch.join(',') },
        });
        if (!Array.isArray(response.data)) {
          continue;
        }

        const mergedBatch: Record<string, MarketQuote> = {};
        response.data.forEach((item) => {
          const normalized = normalizePricePayload(item as PricePayload);
          if (normalized) {
            mergedBatch[normalized.symbol] = normalized;
          }
        });

        if (Object.keys(mergedBatch).length === 0) {
          continue;
        }

        hasAppliedAnyBatch = true;
        set((state) => {
          const nextQuotes = { ...state.quotes, ...mergedBatch };
          persistQuotes(nextQuotes);
          return {
            quotes: nextQuotes,
            // As soon as first batch lands, stop blocking the screen.
            isLoading: false,
            lastUpdatedAt: Date.now(),
          };
        });
      }

      if (!hasAppliedAnyBatch) {
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.detail ?? error?.message ?? 'Failed to fetch market prices.',
      });
    }
  },

  getAssetCatalog: () => ASSET_CATALOG,

  getQuotesForCategory: (category) => {
    const quotes = get().quotes;
    return ASSET_CATALOG.map((asset) => quotes[asset.symbol]).filter((quote): quote is MarketQuote => Boolean(quote)).filter((quote) => {
      if (category === 'favorites') {
        return true;
      }
      return quote.category === category;
    });
  },

  getQuote: (symbol) => get().quotes[symbol.toUpperCase()] ?? null,

  clearError: () => set({ error: null }),

  resetRealtime: () =>
    set({
      isConnected: false,
      initialized: false,
      lastUpdatedAt: null,
    }),
}));
