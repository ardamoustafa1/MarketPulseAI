import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface ActivityStats {
  active_users_today: number;
  portfolios_updated_this_week: number;
  alerts_triggered_this_week: number;
  generated_at: string;
}

interface StatsState {
  activity: ActivityStats | null;
  isLoading: boolean;
  error: string | null;
  fetchActivity: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  activity: null,
  isLoading: false,
  error: null,
  fetchActivity: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<ActivityStats>('/api/v1/stats/activity');
      set({ activity: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || error?.message || 'Failed to load stats.',
        isLoading: false,
      });
    }
  },
}));
