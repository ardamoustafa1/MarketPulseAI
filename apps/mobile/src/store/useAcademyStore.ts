import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface AcademyCard {
  heading: string;
  body: string;
}

export interface AcademyArticleSummary {
  slug: string;
  locale: string;
  category: string;
  title: string;
  subtitle: string;
  read_time_minutes: number;
  hero_color: string;
  tags: string[];
}

export interface AcademyArticle extends AcademyArticleSummary {
  cards: AcademyCard[];
}

interface AcademyState {
  list: AcademyArticleSummary[];
  cache: Record<string, AcademyArticle>;
  isLoading: boolean;
  error: string | null;
  fetchList: (locale?: string) => Promise<void>;
  fetchArticle: (slug: string, locale?: string) => Promise<AcademyArticle | null>;
}

export const useAcademyStore = create<AcademyState>((set, get) => ({
  list: [],
  cache: {},
  isLoading: false,
  error: null,

  fetchList: async (locale = 'tr') => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<AcademyArticleSummary[]>('/api/v1/academy/articles', {
        params: { locale },
      });
      set({ list: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || error?.message || 'Failed to load academy.',
        isLoading: false,
      });
    }
  },

  fetchArticle: async (slug, locale = 'tr') => {
    const cacheKey = `${locale}:${slug}`;
    const cached = get().cache[cacheKey];
    if (cached) return cached;

    try {
      const { data } = await apiClient.get<AcademyArticle>(`/api/v1/academy/articles/${slug}`, {
        params: { locale },
      });
      set((state) => ({ cache: { ...state.cache, [cacheKey]: data } }));
      return data;
    } catch {
      return null;
    }
  },
}));
