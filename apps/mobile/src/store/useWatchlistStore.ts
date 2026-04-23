import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
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

const LOCAL_FAVORITES_KEY = 'watchlist_local_favorites_v1';

async function readLocalFavorites(): Promise<Record<string, WatchlistAsset>> {
  try {
    const raw = await SecureStore.getItemAsync(LOCAL_FAVORITES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const normalized: Record<string, WatchlistAsset> = {};
    Object.entries(parsed).forEach(([symbol, asset]) => {
      if (typeof symbol !== 'string' || !asset || typeof asset !== 'object') return;
      const data = asset as WatchlistAsset;
      normalized[symbol.toUpperCase()] = {
        id: data.id ?? '',
        symbol: symbol.toUpperCase(),
        name: data.name ?? symbol.toUpperCase(),
        type: data.type ?? 'unknown',
        image_url: data.image_url,
        price: data.price,
        change_24h_percent: data.change_24h_percent,
        favorite: true,
      };
    });
    return normalized;
  } catch {
    return {};
  }
}

async function writeLocalFavorites(favorites: Record<string, WatchlistAsset>): Promise<void> {
  try {
    await SecureStore.setItemAsync(LOCAL_FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Local persistence is best-effort.
  }
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

      const localFavorites = await readLocalFavorites();
      const mergedFavorites = { ...localFavorites, ...newFavorites };
      set({ favorites: mergedFavorites, isLoading: false });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        const localFavorites = await readLocalFavorites();
        set({ favorites: localFavorites, isLoading: false, error: null });
        return;
      }
      const localFavorites = await readLocalFavorites();
      set({
        favorites: localFavorites,
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
          const localFavorites = await readLocalFavorites();
          if (localFavorites[symbol]) {
            const { [symbol]: __, ...remaining } = localFavorites;
            await writeLocalFavorites(remaining);
          }
        } catch (e: any) {
          if (e?.response?.status === 401) {
            set({ favorites: currentFavs, error: 'Favorileri yonetmek icin tekrar giris yap.' });
            return;
          }
          if (e?.response?.status === 404) {
            const localFavorites = await readLocalFavorites();
            if (localFavorites[symbol]) {
              const { [symbol]: __, ...remaining } = localFavorites;
              await writeLocalFavorites(remaining);
            }
            set({ error: null });
            return;
          }
          // Rollback
          set({
            favorites: currentFavs,
            error: e?.response?.data?.detail || 'Varlik kaldirilamadi. Tekrar deneyip yeniden senkronize et.',
          });
        }
      } else {
        const optimisticFavorite = { id: '', ...asset, favorite: true } as WatchlistAsset;
        set({ favorites: { ...currentFavs, [symbol]: optimisticFavorite } });

        try {
          await apiClient.post(`/api/v1/watchlist/${encodeURIComponent(symbol)}`);
          const localFavorites = await readLocalFavorites();
          if (localFavorites[symbol]) {
            const { [symbol]: __, ...remaining } = localFavorites;
            await writeLocalFavorites(remaining);
          }
        } catch (e: any) {
          if (e?.response?.status === 401) {
            set({ favorites: currentFavs, error: 'Favorileri yonetmek icin tekrar giris yap.' });
            return;
          }
          if (e?.response?.status === 404) {
            const localFavorites = await readLocalFavorites();
            await writeLocalFavorites({
              ...localFavorites,
              [symbol]: {
                ...(localFavorites[symbol] ?? {}),
                ...optimisticFavorite,
                symbol,
                name: optimisticFavorite.name ?? symbol,
                type: optimisticFavorite.type ?? 'unknown',
                favorite: true,
              } as WatchlistAsset,
            });
            set({ error: null });
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
