import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { apiClient } from '../api/client';
import { TransactionFormData, buildTransactionPayload } from '../utils/transactionValidation';

const ACTIVE_PORTFOLIO_KEY = 'active_portfolio_id';

export interface PortfolioBucket {
  id: string;
  name: string;
  is_default: boolean;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  quantity: string;
  averageCost: string;
  currentValue: string;
  unrealizedPnl: string;
  unrealizedPnlPercent: number;
  hasLivePrice?: boolean;
  isStalePrice?: boolean;
}

export interface PortfolioSummary {
  totalValue: string;
  totalInvested: string;
  unrealizedPnl: string;
  unrealizedPnlPercent: number;
  realizedPnl: string;
  dailyChange: string;
  dailyChangePercent: number;
  valuationComplete?: boolean;
  missingPricePositions?: number;
  stalePricePositions?: number;
}

export interface TransactionRecord {
  id: string;
  assetId: string;
  assetSymbol: string;
  type: 'buy' | 'sell';
  quantity: string;
  price: string;
  fee: string;
  notes: string | null;
  transactionDate: string;
  createdAt: string;
}

interface PortfolioState {
  summary: PortfolioSummary | null;
  positions: PortfolioPosition[];
  recentTransactions: TransactionRecord[];
  buckets: PortfolioBucket[];
  activePortfolioId: string | null;

  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastFetched: number | null;

  hydratePortfolioContext: () => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setActivePortfolioId: (id: string | null) => Promise<void>;
  fetchPortfolio: () => Promise<void>;
  submitTransaction: (data: TransactionFormData) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDecimalString(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return '0';
  }
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) {
    return String(value);
  }
  return '0';
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  summary: null,
  positions: [],
  recentTransactions: [],
  buckets: [],
  activePortfolioId: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastFetched: null,

  hydratePortfolioContext: async () => {
    try {
      const raw = await SecureStore.getItemAsync(ACTIVE_PORTFOLIO_KEY);
      set({ activePortfolioId: raw || null });
    } catch {
      set({ activePortfolioId: null });
    }
  },

  fetchBuckets: async () => {
    try {
      const { data } = await apiClient.get<PortfolioBucket[]>('/api/v1/portfolio/buckets');
      set({ buckets: Array.isArray(data) ? data : [] });
    } catch {
      set({ buckets: [] });
    }
  },

  setActivePortfolioId: async (id) => {
    set({ activePortfolioId: id });
    try {
      if (id) {
        await SecureStore.setItemAsync(ACTIVE_PORTFOLIO_KEY, id);
      } else {
        await SecureStore.deleteItemAsync(ACTIVE_PORTFOLIO_KEY);
      }
    } catch {
      /* ignore */
    }
    await get().fetchPortfolio();
  },

  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const pid = get().activePortfolioId;
      const pfParams = pid ? { portfolio_id: pid } : {};
      const txParams = { limit: 20, offset: 0, ...(pid ? { portfolio_id: pid } : {}) };

      const [portfolioResponse, transactionsResponse] = await Promise.all([
        apiClient.get('/api/v1/portfolio/', { params: pfParams }),
        apiClient.get('/api/v1/transactions/', { params: txParams }),
      ]);

      const data = portfolioResponse.data;
      const transactions = Array.isArray(transactionsResponse.data) ? transactionsResponse.data : [];

      set({
        summary: {
          totalValue: formatDecimalString(data.total_current_value),
          totalInvested: formatDecimalString(data.total_invested),
          unrealizedPnl: formatDecimalString(data.total_unrealized_pnl),
          unrealizedPnlPercent: toNumber(data.total_unrealized_pnl_percent),
          realizedPnl: formatDecimalString(data.total_realized_pnl),
          dailyChange: '0',
          dailyChangePercent: 0,
          valuationComplete: Boolean(data.valuation_complete ?? true),
          missingPricePositions: toNumber(data.missing_price_positions),
          stalePricePositions: toNumber(data.stale_price_positions),
        },
        positions: (data.positions || []).map((p: any) => ({
          id: p.symbol,
          symbol: p.symbol,
          name: p.symbol,
          quantity: formatDecimalString(p.quantity_held),
          averageCost: formatDecimalString(p.average_buy_price),
          currentValue: formatDecimalString(p.current_value),
          unrealizedPnl: formatDecimalString(p.unrealized_pnl),
          unrealizedPnlPercent: toNumber(p.unrealized_pnl_percent),
          hasLivePrice: Boolean(p.has_live_price ?? true),
          isStalePrice: Boolean(p.is_stale_price ?? false),
        })),
        recentTransactions: transactions.map((tx: any) => ({
          id: String(tx.id),
          assetId: String(tx.asset_id),
          assetSymbol: tx.asset_symbol,
          type: tx.type,
          quantity: formatDecimalString(tx.quantity),
          price: formatDecimalString(tx.price),
          fee: formatDecimalString(tx.fee ?? '0'),
          notes: tx.notes ?? null,
          transactionDate: tx.transaction_date,
          createdAt: tx.created_at,
        })),
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.detail || 'Failed to load portfolio data.',
      });
    }
  },

  submitTransaction: async (formData: TransactionFormData) => {
    set({ isSubmitting: true, error: null });
    try {
      const pid = get().activePortfolioId;
      const payload = {
        ...buildTransactionPayload(formData),
        ...(pid ? { portfolio_id: pid } : {}),
      };
      await apiClient.post('/api/v1/transactions/', payload);

      set({ isSubmitting: false });
      await get().fetchPortfolio();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Transaction failed. Please try again.';
      set({ isSubmitting: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  clearError: () => set({ error: null }),
}));
