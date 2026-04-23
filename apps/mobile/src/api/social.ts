import { apiClient } from './client';
import type {
  AssetSocialStats,
  CommunityList,
  CopyFollow,
  CopyFollowMode,
  LeaderboardLeague,
  LeaderboardSeason,
  LiveEvent,
  ReferralBonusKind,
  ReferralClaimResult,
  ReferralCode,
  ShareCardPayload,
  ShareCardRequest,
} from '../types/social';

const BASE = '/api/v1/social';

export const fetchCommunityLists = async (): Promise<CommunityList[]> => {
  const r = await apiClient.get<CommunityList[]>(`${BASE}/community-lists`);
  return r.data;
};

export const fetchCommunityListBySlug = async (slug: string): Promise<CommunityList> => {
  const r = await apiClient.get<CommunityList>(
    `${BASE}/community-lists/${encodeURIComponent(slug)}`,
  );
  return r.data;
};

export const followStrategy = async (body: {
  list_id?: string;
  leader_user_id?: string;
  mode?: CopyFollowMode;
}): Promise<CopyFollow> => {
  const r = await apiClient.post<CopyFollow>(`${BASE}/copy/follow`, body);
  return r.data;
};

export const fetchCopyFollows = async (): Promise<CopyFollow[]> => {
  const r = await apiClient.get<CopyFollow[]>(`${BASE}/copy/follow`);
  return r.data;
};

export const unfollowStrategy = async (followId: string): Promise<void> => {
  await apiClient.delete(`${BASE}/copy/follow/${encodeURIComponent(followId)}`);
};

export const fetchLeaderboard = async (
  league: LeaderboardLeague = 'overall',
  limit = 20,
): Promise<LeaderboardSeason> => {
  const r = await apiClient.get<LeaderboardSeason>(`${BASE}/leaderboard`, {
    params: { league, limit },
  });
  return r.data;
};

export const fetchReferralCode = async (
  bonusKind: ReferralBonusKind = 'silver_grams',
): Promise<ReferralCode> => {
  const r = await apiClient.get<ReferralCode>(`${BASE}/referral/code`, {
    params: { bonus_kind: bonusKind },
  });
  return r.data;
};

export const claimReferralCode = async (code: string): Promise<ReferralClaimResult> => {
  const r = await apiClient.post<ReferralClaimResult>(`${BASE}/referral/claim`, { code });
  return r.data;
};

export const fetchAssetSocial = async (symbol: string): Promise<AssetSocialStats> => {
  const r = await apiClient.get<AssetSocialStats>(
    `${BASE}/assets/${encodeURIComponent(symbol)}/social`,
  );
  return r.data;
};

export const fetchLiveEvents = async (limit = 10): Promise<LiveEvent[]> => {
  const r = await apiClient.get<LiveEvent[]>(`${BASE}/live-events`, { params: { limit } });
  return r.data;
};

export const buildShareCard = async (payload: ShareCardRequest): Promise<ShareCardPayload> => {
  const r = await apiClient.post<ShareCardPayload>(`${BASE}/share-cards`, payload);
  return r.data;
};
