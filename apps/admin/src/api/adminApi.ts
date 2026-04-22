export type ReadinessPayload = {
  ready: boolean;
  checks?: Record<string, boolean>;
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
