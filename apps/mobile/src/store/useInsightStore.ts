import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface InsightCard {
  id: string;
  category: 'portfolio' | 'market' | 'watchlist';
  title: string;
  content: string;
  severity: 'positive' | 'negative' | 'neutral' | 'warning';
}

export interface InsightResponse {
  id: string;
  created_at: string;
  cards: InsightCard[];
  disclaimer: string;
}

interface InsightState {
  latestInsight: InsightResponse | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  fetchLatestInsight: () => Promise<void>;
  generateNewInsight: () => Promise<void>;
  clearError: () => void;
}

export const useInsightStore = create<InsightState>((set) => ({
  latestInsight: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchLatestInsight: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/api/v1/insights');
      set({ latestInsight: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.detail ||
          error.message ||
          'Icgoruler yuklenemedi. Baglantiyi kontrol edip tekrar dene.',
        isLoading: false,
      });
    }
  },

  generateNewInsight: async () => {
    set({ isGenerating: true, error: null });
    try {
      const response = await apiClient.post('/api/v1/insights/generate', {
        include_portfolio: true,
        include_watchlist: true,
      });
      set({ latestInsight: response.data, isGenerating: false });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      set({
        error:
          detail ||
          error.message ||
          'Icgoru uretimi basarisiz. Birkac saniye sonra yeniden dene.',
        isGenerating: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
