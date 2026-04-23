import { apiClient } from './client';
import type {
  DataSourceBadge,
  DisclaimerView,
  SteelAccountView,
  TransparencyView,
} from '../types/trust';

const BASE = '/api/v1/trust';

export const fetchLiveBadge = async (symbol: string): Promise<DataSourceBadge> => {
  const r = await apiClient.get<DataSourceBadge>(
    `${BASE}/live-badge/${encodeURIComponent(symbol)}`,
  );
  return r.data;
};

export const fetchTransparency = async (): Promise<TransparencyView> => {
  const r = await apiClient.get<TransparencyView>(`${BASE}/transparency`);
  return r.data;
};

export const fetchDisclaimer = async (locale: string = 'tr'): Promise<DisclaimerView> => {
  const r = await apiClient.get<DisclaimerView>(`${BASE}/disclaimer`, {
    params: { locale },
  });
  return r.data;
};

export const fetchSteelAccount = async (): Promise<SteelAccountView> => {
  const r = await apiClient.get<SteelAccountView>(`${BASE}/steel-account`);
  return r.data;
};
