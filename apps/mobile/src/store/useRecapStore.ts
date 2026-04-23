import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface RecapHighlight {
  label: string;
  value: string;
  delta?: string | null;
}

export interface RecapAssetLine {
  symbol: string;
  quantity: string;
  realized_pnl: string;
  pct_change: string;
}

export interface WeeklyRecap {
  period_start: string;
  period_end: string;
  headline: string;
  narrative: string;
  highlights: RecapHighlight[];
  top_assets: RecapAssetLine[];
  actions_count: number;
}

export interface MonthlyWrappedCard {
  kind: string;
  eyebrow: string;
  title: string;
  body: string;
  accent_color: string;
  stat?: string | null;
  support_stat?: string | null;
}

export interface MonthlyWrapped {
  period_start: string;
  period_end: string;
  cards: MonthlyWrappedCard[];
}

interface RecapState {
  weekly: WeeklyRecap | null;
  monthly: MonthlyWrapped | null;
  isLoading: boolean;
  error: string | null;
  fetchWeekly: () => Promise<void>;
  fetchMonthly: () => Promise<void>;
}

export const useRecapStore = create<RecapState>((set) => ({
  weekly: null,
  monthly: null,
  isLoading: false,
  error: null,

  fetchWeekly: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<WeeklyRecap>('/api/v1/portfolio/weekly-recap');
      set({ weekly: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || error?.message || 'Weekly recap failed.',
        isLoading: false,
      });
    }
  },

  fetchMonthly: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<MonthlyWrapped>('/api/v1/portfolio/monthly-wrapped');
      set({ monthly: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || error?.message || 'Monthly wrapped failed.',
        isLoading: false,
      });
    }
  },
}));
