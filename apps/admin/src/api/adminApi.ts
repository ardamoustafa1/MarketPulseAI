export type ReadinessPayload = {
  ready: boolean;
  checks?: Record<string, boolean>;
};

export type HealthPayload = {
  status: string;
  metrics?: {
    total_requests?: number;
    error_rate_percent?: number;
    p95_latency_ms?: number;
  };
};

export type NorthStarPayload = {
  total_users: number;
  activated_users: number;
  activation_rate_percent: number;
  retention_proxy_percent: number;
  weekly_active_ratio_percent: number;
  push_reachable_users: number;
  coach_hub_open_users_7d: number;
  coach_action_users_7d: number;
  coach_action_conversion_percent_7d: number;
  cohort_retention: Array<{
    cohort: string;
    users: number;
    retention_7d_percent: number;
    retention_30d_percent: number;
  }>;
};

export type PriceItem = {
  symbol: string;
  source?: string;
  is_stale?: boolean;
  last_updated_at?: string;
};

export type AssetItem = {
  id: string;
  symbol: string;
  name: string;
  type: string;
  is_active?: boolean;
  image_url?: string | null;
};

export type UserItem = {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  subscription_tier?: string;
};

export type AuditLogItem = {
  id: string;
  user_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_table: string;
  entity_id: string;
  details?: Record<string, unknown> | null;
  created_at: string;
};

export type AdminActionItem = {
  id: string;
  admin_id: string;
  admin_email?: string | null;
  target_user_id?: string | null;
  action: string;
  reason?: string | null;
  created_at: string;
};

export type InsightAdminItem = {
  id: string;
  user_id: string;
  user_email?: string | null;
  insight_type: string;
  content: string;
  created_at: string;
};

export type AdminTimelineItem = {
  id: string;
  source: string;
  actor?: string | null;
  action: string;
  target: string;
  details?: Record<string, unknown> | null;
  created_at: string;
};

export type AdminManagedAsset = {
  id: string;
  symbol: string;
  name: string;
  type: string;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
};

export type AdminTransactionItem = {
  id: string;
  user_id: string;
  user_email: string;
  portfolio_id: string;
  asset_id: string;
  asset_symbol: string;
  tx_type: string;
  quantity: string;
  price?: string | null;
  transaction_date: string;
  created_at: string;
};

function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return 'http://localhost:8000';
}

async function getJson<T>(path: string): Promise<T> {
  const accessToken = localStorage.getItem('admin_access_token');
  const headers: HeadersInit = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  const response = await fetch(`${getApiBaseUrl()}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchReadiness(): Promise<ReadinessPayload> {
  return getJson<ReadinessPayload>('/api/v1/health/readiness');
}

export async function fetchHealth(): Promise<HealthPayload> {
  return getJson<HealthPayload>('/api/v1/health/');
}

export async function fetchNorthStar(): Promise<NorthStarPayload> {
  return getJson<NorthStarPayload>('/api/v1/strategy/north-star');
}

export async function fetchAssets(): Promise<AssetItem[]> {
  return getJson<AssetItem[]>('/api/v1/assets');
}

export async function fetchPrices(symbols: string[]): Promise<PriceItem[]> {
  if (symbols.length === 0) {
    return [];
  }
  const query = encodeURIComponent(symbols.join(','));
  return getJson<PriceItem[]>(`/api/v1/prices?symbols=${query}`);
}

export async function fetchUsers(): Promise<UserItem[]> {
  return getJson<UserItem[]>('/api/v1/users');
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLogItem[]> {
  return getJson<AuditLogItem[]>(`/api/v1/audit-logs?limit=${limit}`);
}

export async function fetchAdminActions(limit = 100): Promise<AdminActionItem[]> {
  return getJson<AdminActionItem[]>(`/api/v1/admin/actions?limit=${limit}`);
}

export async function fetchAdminInsights(limit = 100): Promise<InsightAdminItem[]> {
  return getJson<InsightAdminItem[]>(`/api/v1/admin/insights?limit=${limit}`);
}

export async function updateAdminUser(
  userId: string,
  payload: { role?: string; is_active?: boolean; subscription_tier?: string }
): Promise<UserItem> {
  const accessToken = localStorage.getItem('admin_access_token');
  const response = await fetch(`${getApiBaseUrl()}/api/v1/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }
  return (await response.json()) as UserItem;
}

export async function fetchAdminAuditTimeline(limit = 250): Promise<AdminTimelineItem[]> {
  return getJson<AdminTimelineItem[]>(`/api/v1/admin/audit-timeline?limit=${limit}`);
}

export async function fetchManagedAssets(limit = 500): Promise<AdminManagedAsset[]> {
  return getJson<AdminManagedAsset[]>(`/api/v1/admin/assets?limit=${limit}`);
}

export async function createManagedAsset(payload: {
  symbol: string;
  name: string;
  type: 'crypto' | 'fiat' | 'metal';
  is_active?: boolean;
  image_url?: string | null;
}): Promise<AdminManagedAsset> {
  const accessToken = localStorage.getItem('admin_access_token');
  const response = await fetch(`${getApiBaseUrl()}/api/v1/admin/assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }
  return (await response.json()) as AdminManagedAsset;
}

export async function updateManagedAsset(
  assetId: string,
  payload: { name?: string; is_active?: boolean; image_url?: string | null }
): Promise<AdminManagedAsset> {
  const accessToken = localStorage.getItem('admin_access_token');
  const response = await fetch(`${getApiBaseUrl()}/api/v1/admin/assets/${assetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }
  return (await response.json()) as AdminManagedAsset;
}

export async function fetchAdminTransactions(limit = 200): Promise<AdminTransactionItem[]> {
  return getJson<AdminTransactionItem[]>(`/api/v1/admin/transactions?limit=${limit}`);
}

export async function deleteAdminTransaction(
  transactionId: string,
  stepUp?: { token: string; totp: string }
): Promise<void> {
  const accessToken = localStorage.getItem('admin_access_token');
  const stepUpToken = stepUp?.token ?? localStorage.getItem('admin_step_up_token');
  const stepUpTotp = stepUp?.totp ?? '';
  const response = await fetch(`${getApiBaseUrl()}/api/v1/admin/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(stepUpToken ? { 'x-admin-step-up': stepUpToken } : {}),
      ...(stepUpTotp ? { 'x-admin-step-up-totp': stepUpTotp } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }
}
