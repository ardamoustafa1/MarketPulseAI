import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface WatchlistAsset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  price?: number;
  change_24h_percent?: number;
  image_url?: string;
  favorite?: boolean;
}

export interface WatchlistState {
  favorites: Record<string, WatchlistAsset>;
  isLoading: boolean;
  error: string | null;
  _toggleLock: Set<string>; // Prevents race conditions on rapid double-taps
  
  // Actions
  fetchWatchlist: () => Promise<void>;
  toggleFavorite: (asset: Partial<WatchlistAsset> & { symbol: string }) => Promise<void>;
  isFavorite: (symbol: string) => boolean;
  getFavoritesArray: () => WatchlistAsset[];
  clearError: () => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  favorites: {},
  isLoading: false,
  error: null,
  _toggleLock: new Set(),

  fetchWatchlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/api/v1/watchlist/');
      const payload = response.data;
      const assets: WatchlistAsset[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.assets)
          ? payload.assets
          : [];
      
      const newFavorites: Record<string, WatchlistAsset> = {};
      assets.forEach(asset => {
        newFavorites[asset.symbol.toUpperCase()] = { ...asset, favorite: true };
      });
      
      set({ favorites: newFavorites, isLoading: false });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        set({ favorites: {}, isLoading: false, error: null });
        return;
      }
      set({
        error:
          error?.response?.data?.detail ||
          error.message ||
          'Izleme listesi yuklenemedi. Baglantiyi kontrol edip yeniden dene.',
        isLoading: false,
      });
    }
  },

  toggleFavorite: async (asset) => {
    const symbol = asset.symbol.toUpperCase();
    const lock = new Set(get()._toggleLock);

    // Debounce guard: prevent concurrent toggles for the same symbol
    if (lock.has(symbol)) return;
    lock.add(symbol);
    set({ _toggleLock: new Set(lock) });

    try {
      const currentFavs = get().favorites;
      const isFav = !!currentFavs[symbol];

      // Optimistic UI Update
      if (isFav) {
        const { [symbol]: _, ...rest } = currentFavs;
        set({ favorites: rest });

        try {
          await apiClient.delete(`/api/v1/watchlist/${encodeURIComponent(symbol)}`);
        } catch (e: any) {
          if (e?.response?.status === 401) {
            set({ favorites: currentFavs, error: 'Favorileri yonetmek icin tekrar giris yap.' });
            return;
          }
          // Rollback
          set({
            favorites: currentFavs,
            error: e?.response?.data?.detail || 'Varlik kaldirilamadi. Tekrar deneyip yeniden senkronize et.',
          });
        }
      } else {
        set({ favorites: { ...currentFavs, [symbol]: { id: '', ...asset, favorite: true } as WatchlistAsset } });

        try {
          await apiClient.post(`/api/v1/watchlist/${encodeURIComponent(symbol)}`);
        } catch (e: any) {
          if (e?.response?.status === 401) {
            set({ favorites: currentFavs, error: 'Favorileri yonetmek icin tekrar giris yap.' });
            return;
          }
          // Rollback
          set({
            favorites: currentFavs,
            error: e?.response?.data?.detail || 'Varlik eklenemedi. Tekrar deneyip yeniden senkronize et.',
          });
        }
      }
    } finally {
      const currentLock = new Set(get()._toggleLock);
      currentLock.delete(symbol);
      set({ _toggleLock: currentLock });
    }
  },

  isFavorite: (symbol: string) => {
    return !!get().favorites[symbol.toUpperCase()];
  },

  getFavoritesArray: () => Object.values(get().favorites),

  clearError: () => set({ error: null }),
}));
