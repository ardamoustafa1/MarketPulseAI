import { create } from 'zustand';
import { fetchIntelligenceHub, IntelligenceHubResponse } from '../api/intelligence';

interface IntelligenceState {
  hub: IntelligenceHubResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  fetchHub: (opts?: { force?: boolean; locale?: 'tr' | 'en' }) => Promise<void>;
  clearError: () => void;
}

// Cache TTL: avoid hammering the API when the user bounces in/out of the screen.
const SOFT_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const useIntelligenceStore = create<IntelligenceState>((set, get) => ({
  hub: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchedAt: null,

  fetchHub: async ({ force = false, locale = 'tr' as 'tr' | 'en' } = {}) => {
    const { hub, lastFetchedAt } = get();
    const isFresh = lastFetchedAt !== null && Date.now() - lastFetchedAt < SOFT_TTL_MS;
    if (hub && isFresh && !force) {
      return;
    }
    set({ isLoading: hub === null, isRefreshing: hub !== null, error: null });
    try {
      const data = await fetchIntelligenceHub(locale);
      set({
        hub: data,
        isLoading: false,
        isRefreshing: false,
        lastFetchedAt: Date.now(),
      });
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      set({
        error:
          err?.response?.data?.detail ||
          err?.message ||
          'Intelligence hub verisi yüklenemedi. Tekrar deneyin.',
        isLoading: false,
        isRefreshing: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
