export interface DataSourceBadge {
  symbol: string;
  source_label: string;
  source_code: string;
  last_updated_at: string | null;
  age_seconds: number | null;
  freshness: 'live' | 'recent' | 'stale';
  badge_tone: 'positive' | 'neutral' | 'warning';
  disclosure: string;
}

export interface ProviderEntry {
  code: string;
  name: string;
  category: 'market_data' | 'macro' | 'fx' | 'commodity' | 'news' | 'security';
  description: string;
  coverage: string[];
  website_url: string | null;
  terms_url: string | null;
}

export interface TransparencyView {
  providers: ProviderEntry[];
  policies: Array<{ code: string; title: string; url: string }>;
  last_reviewed_at: string;
}

export interface DisclaimerView {
  locale: string;
  title: string;
  body: string;
  acknowledgement_cta: string;
  version: string;
  effective_at: string;
}

export interface SecurityControl {
  code:
    | 'email_verified'
    | 'two_factor_totp'
    | 'biometric_app_lock'
    | 'strong_password'
    | 'recovery_email'
    | 'push_confirmation';
  label: string;
  enabled: boolean;
  weight: number;
  tip: string | null;
}

export interface SteelAccountView {
  score: number;
  max_score: number;
  tier: 'starter' | 'shielded' | 'steel' | 'titanium';
  is_steel: boolean;
  controls: SecurityControl[];
  next_action: string | null;
  badge_updated_at: string;
}
