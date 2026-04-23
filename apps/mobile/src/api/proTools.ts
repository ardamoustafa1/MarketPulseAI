import { apiClient } from './client';
import type {
  FormulaAlertPayload,
  FormulaAlertView,
  FormulaEvaluationResult,
  SlicingPlanView,
  SpreadView,
  StrategyBacktestView,
  StrategyListView,
  StrategyRulePayload,
  TaxExportPayload,
  TaxExportView,
  TechnicalAnalysisView,
  Timeframe,
  VolatilityConeView,
} from '../types/proTools';

const BASE = '/api/v1/pro-tools';

// ─── Technical Analysis ────────────────────────────────────────────────────
export const fetchTechnicalAnalysis = async (
  symbol: string,
  timeframe: Timeframe = '1d',
): Promise<TechnicalAnalysisView> => {
  const r = await apiClient.get<TechnicalAnalysisView>(
    `${BASE}/technical-analysis/${encodeURIComponent(symbol)}`,
    { params: { timeframe } },
  );
  return r.data;
};

// ─── Formula Alerts ────────────────────────────────────────────────────────
export const fetchFormulaAlerts = async (): Promise<FormulaAlertView[]> => {
  const r = await apiClient.get<FormulaAlertView[]>(`${BASE}/formula-alerts`);
  return r.data;
};

export const createFormulaAlert = async (
  payload: FormulaAlertPayload,
): Promise<FormulaAlertView> => {
  const r = await apiClient.post<FormulaAlertView>(`${BASE}/formula-alerts`, payload);
  return r.data;
};

export const toggleFormulaAlert = async (
  alertId: string,
  active: boolean,
): Promise<FormulaAlertView> => {
  const r = await apiClient.post<FormulaAlertView>(
    `${BASE}/formula-alerts/${encodeURIComponent(alertId)}/toggle`,
    null,
    { params: { active } },
  );
  return r.data;
};

export const deleteFormulaAlert = async (alertId: string): Promise<void> => {
  await apiClient.delete(`${BASE}/formula-alerts/${encodeURIComponent(alertId)}`);
};

export const evaluateFormulaAlert = async (
  alertId: string,
): Promise<FormulaEvaluationResult> => {
  const r = await apiClient.post<FormulaEvaluationResult>(
    `${BASE}/formula-alerts/${encodeURIComponent(alertId)}/evaluate`,
  );
  return r.data;
};

export const evaluateAllFormulaAlerts = async (): Promise<FormulaEvaluationResult[]> => {
  const r = await apiClient.post<FormulaEvaluationResult[]>(
    `${BASE}/formula-alerts/evaluate-all`,
  );
  return r.data;
};

// ─── Spread / Volatility / Slicing / Tax / Playground ──────────────────────
export const fetchSpreadView = async (symbol: string): Promise<SpreadView> => {
  const r = await apiClient.get<SpreadView>(`${BASE}/spread/${encodeURIComponent(symbol)}`);
  return r.data;
};

export const fetchVolatilityCone = async (
  symbol: string,
  window: number = 30,
): Promise<VolatilityConeView> => {
  const r = await apiClient.get<VolatilityConeView>(
    `${BASE}/volatility-cone/${encodeURIComponent(symbol)}`,
    { params: { window } },
  );
  return r.data;
};

export const fetchPositionSlicing = async (params: {
  symbol: string;
  total_budget: number;
  currency?: 'TRY' | 'USD' | 'EUR';
  slice_count?: number;
  cadence_days?: number;
}): Promise<SlicingPlanView> => {
  const r = await apiClient.get<SlicingPlanView>(`${BASE}/position-slicing`, {
    params: {
      symbol: params.symbol,
      total_budget: params.total_budget,
      currency: params.currency ?? 'TRY',
      slice_count: params.slice_count ?? 4,
      cadence_days: params.cadence_days ?? 7,
    },
  });
  return r.data;
};

export const buildTaxExport = async (
  payload: TaxExportPayload,
): Promise<TaxExportView> => {
  const r = await apiClient.post<TaxExportView>(`${BASE}/tax-export`, payload);
  return r.data;
};

export const runStrategyPlayground = async (
  payload: StrategyRulePayload,
): Promise<StrategyBacktestView> => {
  const r = await apiClient.post<StrategyBacktestView>(
    `${BASE}/strategy-playground`,
    payload,
  );
  return r.data;
};

export const fetchStrategyList = async (): Promise<StrategyListView> => {
  const r = await apiClient.get<StrategyListView>(`${BASE}/strategy-playground`);
  return r.data;
};

export const deleteStrategyRule = async (ruleId: string): Promise<void> => {
  await apiClient.delete(
    `${BASE}/strategy-playground/${encodeURIComponent(ruleId)}`,
  );
};
