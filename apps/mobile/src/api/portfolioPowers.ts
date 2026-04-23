import { apiClient } from './client';
import type {
  DcaSimulationResponse,
  Denomination,
  DenominationResponse,
  MultiAssetGoalPayload,
  MultiAssetGoalView,
  PaperOrderList,
  PaperOrderPayload,
  PaperOrderView,
  RebalancePlan,
  RebalanceTargetPayload,
  SharedMemberPayload,
  SharedMemberView,
  StressScenarioId,
  StressTestResponse,
  TaxLotReport,
  TaxMethod,
} from '../types/portfolioPowers';

const BASE = '/api/v1/portfolio-powers';

// Denomination
export const fetchDenomination = async (
  denomination: Denomination,
  portfolioId?: string,
): Promise<DenominationResponse> => {
  const { data } = await apiClient.get<DenominationResponse>(`${BASE}/denomination`, {
    params: { denomination, ...(portfolioId ? { portfolio_id: portfolioId } : {}) },
  });
  return data;
};

// Rebalancer
export const fetchRebalancePlan = async (portfolioId?: string): Promise<RebalancePlan> => {
  const { data } = await apiClient.get<RebalancePlan>(`${BASE}/rebalance`, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};
export const updateRebalanceTarget = async (
  payload: RebalanceTargetPayload,
  portfolioId?: string,
): Promise<RebalancePlan> => {
  const { data } = await apiClient.put<RebalancePlan>(`${BASE}/rebalance`, payload, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};

// DCA
export const runDcaSimulation = async (
  symbol: string,
  installmentAmount: number,
  currency: Denomination = 'TRY',
  cadence: 'weekly' | 'biweekly' | 'monthly' = 'monthly',
  startDate?: string,
): Promise<DcaSimulationResponse> => {
  const { data } = await apiClient.post<DcaSimulationResponse>(`${BASE}/dca`, null, {
    params: {
      symbol,
      installment_amount: installmentAmount,
      currency,
      cadence,
      ...(startDate ? { start_date: startDate } : {}),
    },
  });
  return data;
};

// Paper Orders
export const createPaperOrder = async (
  payload: PaperOrderPayload,
  portfolioId?: string,
): Promise<PaperOrderView[]> => {
  const { data } = await apiClient.post<PaperOrderView[]>(`${BASE}/paper-orders`, payload, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};
export const listPaperOrders = async (portfolioId?: string): Promise<PaperOrderList> => {
  const { data } = await apiClient.get<PaperOrderList>(`${BASE}/paper-orders`, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};
export const evaluatePaperOrders = async (
  portfolioId?: string,
): Promise<{ orders_updated: number }> => {
  const { data } = await apiClient.post<{ orders_updated: number }>(
    `${BASE}/paper-orders/evaluate`,
    null,
    { params: portfolioId ? { portfolio_id: portfolioId } : undefined },
  );
  return data;
};
export const cancelPaperOrder = async (orderId: string): Promise<PaperOrderView> => {
  const { data } = await apiClient.delete<PaperOrderView>(`${BASE}/paper-orders/${orderId}`);
  return data;
};

// Tax Lots
export const fetchTaxLots = async (
  method: TaxMethod = 'fifo',
  portfolioId?: string,
): Promise<TaxLotReport> => {
  const { data } = await apiClient.get<TaxLotReport>(`${BASE}/tax-lots`, {
    params: { method, ...(portfolioId ? { portfolio_id: portfolioId } : {}) },
  });
  return data;
};

// Multi-asset Goals
export const createMultiAssetGoal = async (
  payload: MultiAssetGoalPayload,
  portfolioId?: string,
): Promise<MultiAssetGoalView> => {
  const { data } = await apiClient.post<MultiAssetGoalView>(`${BASE}/goals`, payload, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};
export const listMultiAssetGoals = async (
  portfolioId?: string,
): Promise<MultiAssetGoalView[]> => {
  const { data } = await apiClient.get<MultiAssetGoalView[]>(`${BASE}/goals`, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};
export const archiveMultiAssetGoal = async (goalId: string): Promise<void> => {
  await apiClient.delete(`${BASE}/goals/${goalId}`);
};

// Shared
export const inviteSharedMember = async (
  payload: SharedMemberPayload,
  portfolioId?: string,
): Promise<SharedMemberView> => {
  const { data } = await apiClient.post<SharedMemberView>(`${BASE}/shared`, payload, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};
export const listSharedMembers = async (
  portfolioId?: string,
): Promise<SharedMemberView[]> => {
  const { data } = await apiClient.get<SharedMemberView[]>(`${BASE}/shared`, {
    params: portfolioId ? { portfolio_id: portfolioId } : undefined,
  });
  return data;
};
export const acceptSharedInvite = async (token: string): Promise<SharedMemberView> => {
  const { data } = await apiClient.post<SharedMemberView>(
    `${BASE}/shared/accept/${encodeURIComponent(token)}`,
  );
  return data;
};
export const revokeSharedMember = async (memberId: string): Promise<void> => {
  await apiClient.delete(`${BASE}/shared/${memberId}`);
};

// Stress
export const runStressTest = async (
  scenarios?: StressScenarioId[],
  portfolioId?: string,
): Promise<StressTestResponse> => {
  const { data } = await apiClient.post<StressTestResponse>(
    `${BASE}/stress-test`,
    scenarios ?? null,
    { params: portfolioId ? { portfolio_id: portfolioId } : undefined },
  );
  return data;
};
