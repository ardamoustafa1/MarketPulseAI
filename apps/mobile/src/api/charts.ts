import { apiClient } from './client';

export type HistoryPoint = { t: number; close: number };

export type PriceHistoryResponse = {
  symbol: string;
  range: string;
  source: string;
  yahoo_ticker: string;
  points: HistoryPoint[];
};

export type CompareSeries = {
  symbol: string;
  yahoo_ticker: string;
  points: HistoryPoint[];
};

export type CompareResponse = {
  range: string;
  source: string;
  series: CompareSeries[];
};

export async function fetchPriceHistory(symbol: string, range: string): Promise<PriceHistoryResponse> {
  const { data } = await apiClient.get<PriceHistoryResponse>('/api/v1/charts/history', {
    params: { symbol, range },
  });
  return data;
}

export async function fetchCompare(symbols: string[], range: string): Promise<CompareResponse> {
  const { data } = await apiClient.get<CompareResponse>('/api/v1/charts/compare', {
    params: { symbols: symbols.join(','), range },
  });
  return data;
}
