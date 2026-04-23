import { apiClient } from './client';
import type { DeepCardResponse } from '../types/deepCard';

export const fetchDeepCard = async (
  symbol: string,
  label?: string,
): Promise<DeepCardResponse> => {
  const response = await apiClient.get<DeepCardResponse>(
    `/api/v1/deep-card/${encodeURIComponent(symbol)}`,
    { params: label ? { label } : undefined },
  );
  return response.data;
};
