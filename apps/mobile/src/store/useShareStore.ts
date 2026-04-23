import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface SharedAsset {
  symbol: string;
  name: string;
  type: string;
}

export interface SharePayload {
  token: string;
  share_url: string;
  owner_display_name: string;
  asset_count: number;
  assets: SharedAsset[];
  expires_at: string;
}

interface ShareState {
  latestPayload: SharePayload | null;
  viewedPayload: SharePayload | null;
  isCreating: boolean;
  error: string | null;
  createWatchlistShare: (origin?: string) => Promise<SharePayload | null>;
  viewSharedWatchlist: (token: string) => Promise<SharePayload | null>;
  reset: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  latestPayload: null,
  viewedPayload: null,
  isCreating: false,
  error: null,

  createWatchlistShare: async (origin = 'https://marketpulse.app') => {
    set({ isCreating: true, error: null });
    try {
      const { data } = await apiClient.post<SharePayload>('/api/v1/watchlist/share', {
        origin,
      });
      set({ latestPayload: data, isCreating: false });
      return data;
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || error?.message || 'Share failed.',
        isCreating: false,
      });
      return null;
    }
  },

  viewSharedWatchlist: async (token) => {
    try {
      const { data } = await apiClient.get<SharePayload>(`/api/v1/shared/watchlist/${token}`);
      set({ viewedPayload: data });
      return data;
    } catch (error: any) {
      set({ error: error?.response?.data?.detail || error?.message || 'Share expired.' });
      return null;
    }
  },

  reset: () => set({ latestPayload: null, viewedPayload: null, error: null }),
}));
