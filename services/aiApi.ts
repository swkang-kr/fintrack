import { supabase } from '@/lib/supabase';
import {
  AiChatMessage, AiChatResponse,
  AiCreditsResponse,
  AiDiscoverResponse,
  AiFxTimingResponse,
  AiHealthScoreResponse,
  AiHistoryItem, AiImproveResponse,
  AiNewsResponse, AiNewsTickerInput,
  AiRebalancePlanResponse,
  AiReportRequest, AiReportResponse,
  AiTaxResponse,
  AiUsageResponse,
} from '@/types/report';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/** 오늘 사용량 조회 (bonus 포함) */
export async function getAiUsage(): Promise<AiUsageResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');

  const res = await fetch(`${API_BASE}/api/ai/analyze`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) throw new Error('사용량 조회 실패');
  return res.json();
}

export async function analyzePortfolio(
  data: AiReportRequest
): Promise<AiReportResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');

  const res = await fetch(`${API_BASE}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(
        `일일 분석 한도(${err.limitPerDay ?? 5}회)를 초과했습니다.`
      );
    }
    throw new Error(err.error ?? '분석 요청에 실패했습니다.');
  }

  return res.json() as Promise<AiReportResponse>;
}

export async function improvePortfolio(
  data: AiReportRequest
): Promise<AiImproveResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');

  const res = await fetch(`${API_BASE}/api/ai/improve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(`일일 분석 한도(${err.limitPerDay ?? 5}회)를 초과했습니다.`);
    }
    throw new Error(err.error ?? '개선 분석 요청에 실패했습니다.');
  }

  return res.json() as Promise<AiImproveResponse>;
}

export async function getAiHistory(): Promise<{ history: AiHistoryItem[] }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');

  const res = await fetch(`${API_BASE}/api/ai/history`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) throw new Error('히스토리 조회 실패');
  return res.json();
}

export async function fetchAiNews(
  tickers: AiNewsTickerInput[]
): Promise<AiNewsResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');

  const res = await fetch(`${API_BASE}/api/ai/news`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tickers }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(`일일 분석 한도(${err.limitPerDay ?? 5}회)를 초과했습니다.`);
    }
    throw new Error(err.error ?? '뉴스 브리핑 요청에 실패했습니다.');
  }

  return res.json() as Promise<AiNewsResponse>;
}

// ─── 신규 AI 기능 ─────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');
  return session.access_token;
}

async function postAi<T>(path: string, body: unknown): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error(`일일 분석 한도를 초과했습니다.`);
    throw new Error(err.error ?? '요청에 실패했습니다.');
  }
  return res.json() as Promise<T>;
}

export async function sendAiChat(data: {
  messages: AiChatMessage[];
  holdings: AiReportRequest['holdings'];
  totalValueKrw: number;
  usdKrw: number;
}): Promise<AiChatResponse> {
  return postAi<AiChatResponse>('/api/ai/chat', data);
}

export async function getAiTax(data: AiReportRequest): Promise<AiTaxResponse> {
  return postAi<AiTaxResponse>('/api/ai/tax', data);
}

export async function getAiHealthScore(data: AiReportRequest): Promise<AiHealthScoreResponse> {
  return postAi<AiHealthScoreResponse>('/api/ai/health-score', data);
}

export async function getAiDiscover(data: AiReportRequest): Promise<AiDiscoverResponse> {
  return postAi<AiDiscoverResponse>('/api/ai/discover', data);
}

export async function getAiRebalancePlan(data: AiReportRequest): Promise<AiRebalancePlanResponse> {
  return postAi<AiRebalancePlanResponse>('/api/ai/rebalance-plan', data);
}

export async function getAiFxTiming(data: {
  currencies: string[];
  rates: Record<string, number>;
  usdKrw: number;
}): Promise<AiFxTimingResponse> {
  return postAi<AiFxTimingResponse>('/api/ai/fx-timing', data);
}

export async function claimRewardCredit(): Promise<AiCreditsResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/ai/credits/reward`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? '크레딧 지급에 실패했습니다.');
  }
  return res.json() as Promise<AiCreditsResponse>;
}
