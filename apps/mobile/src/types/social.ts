export type CommunityListCategory = 'curated' | 'user' | 'system';

export interface CommunityListItem {
  symbol: string;
  suggested_weight_pct: number | null;
  position: number;
}

export interface CommunityList {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  slug: string;
  emoji: string | null;
  hero_color: string | null;
  category: CommunityListCategory;
  theme: string | null;
  curator_display_name: string | null;
  is_featured: boolean;
  follower_count: number;
  item_count: number;
  items: CommunityListItem[];
  share_url: string | null;
}

export type CopyFollowMode = 'allocation' | 'watchlist' | 'paper_trades';

export interface CopyFollow {
  id: string;
  leader_user_id: string | null;
  leader_display_name: string | null;
  list_id: string | null;
  list_title: string | null;
  mode: CopyFollowMode;
  last_synced_at: string | null;
  snapshot: Record<string, unknown> | null;
}

export type LeaderboardLeague =
  | 'overall'
  | 'crypto'
  | 'metals'
  | 'fx'
  | 'equity'
  | 'commodity';

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  score: number;
  roi_pct: number;
  win_count: number;
  is_you: boolean;
}

export interface LeaderboardSeason {
  id: string;
  index: number;
  title: string;
  league: LeaderboardLeague;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  days_remaining: number;
  entries: LeaderboardEntry[];
  your_rank: number | null;
}

export type ReferralBonusKind = 'silver_grams' | 'usdt_points' | 'gold_quarter';

export interface ReferralCode {
  code: string;
  bonus_kind: ReferralBonusKind;
  bonus_amount: number;
  claimed_count: number;
  share_url: string;
}

export interface ReferralClaimResult {
  accepted: boolean;
  bonus_kind: ReferralBonusKind;
  bonus_awarded: number;
  owner_display_name: string | null;
}

export interface AssetSocialStats {
  symbol: string;
  added_this_week: number;
  bought_this_week: number;
  sold_this_week: number;
  net_momentum_pct: number;
  in_watchlists: number;
  generated_at: string;
}

export type LiveEventKind =
  | 'live_stream'
  | 'market_open'
  | 'market_close'
  | 'fed_decision'
  | 'tcmb_decision'
  | 'ceremony';

export interface LiveEvent {
  id: string;
  title: string;
  description: string | null;
  kind: LiveEventKind;
  asset_class: string | null;
  scheduled_at: string;
  duration_minutes: number;
  host_display_name: string | null;
  hero_image_url: string | null;
  stream_url: string | null;
  starts_in_seconds: number;
}

export type ShareCardKind =
  | 'asset_snapshot'
  | 'portfolio_wrapped'
  | 'dca_result'
  | 'streak'
  | 'decision'
  | 'goal_progress'
  | 'compare';

export interface ShareCardTheme {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ShareCardMetric {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface ShareCardPayload {
  id: string;
  kind: ShareCardKind;
  title: string;
  subtitle: string | null;
  headline: string;
  subline: string | null;
  badge: string | null;
  source: string;
  asset_symbol: string | null;
  asset_class: string | null;
  theme: ShareCardTheme;
  metrics: ShareCardMetric[];
  watermark_text: string;
  deep_link: string;
  generated_at: string;
}

export interface ShareCardRequest {
  kind: ShareCardKind;
  symbol?: string;
  extra_symbols?: string[];
  decision?: 'buy' | 'hold' | 'sell';
  note?: string;
}
