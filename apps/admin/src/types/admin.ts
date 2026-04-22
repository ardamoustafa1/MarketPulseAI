import type { AdminRole } from '../components/AuthProvider';

export type KpiCard = {
  label: string;
  value: string;
  delta: string;
};

export type UserRecord = {
  id: string;
  email: string;
  role: string;
  status: string;
  region: string;
  createdAt: string;
  subscriptionTier: string;
};

export type AssetRecord = {
  symbol: string;
  source: string;
  status: string;
  lastSync: string;
  confidence: number;
};

export type PriceSourceHealthRecord = {
  source: string;
  uptime: string;
  latency: string;
  incident: string;
};

export type AiInsightLogRecord = {
  id: string;
  asset: string;
  model: string;
  severity: string;
  createdAt: string;
  content: string;
};

export type AuditLogRecord = {
  id: string;
  actor: string;
  action: string;
  target: string;
  result: string;
  details: string;
  createdAt: string;
};

export type FailedSyncRecord = {
  id: string;
  stream: string;
  reason: string;
  retry: string;
  status: string;
};

export type FeatureToggleRecord = {
  key: string;
  owner: string;
  state: string;
};

export type AdminActionRecord = {
  action: string;
  owner: string;
  scope: string;
};

export type TransactionRecord = {
  id: string;
  symbol: string;
  type: string;
  quantity: string;
  price: string;
  date: string;
};

export type NavItem = {
  to: string;
  label: string;
  requiredRoles?: AdminRole[];
};
