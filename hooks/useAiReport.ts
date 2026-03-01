import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  analyzePortfolio,
  claimRewardCredit,
  fetchAiNews,
  getAiDiscover,
  getAiFxTiming,
  getAiHealthScore,
  getAiHistory,
  getAiRebalancePlan,
  getAiTax,
  getAiUsage,
  improvePortfolio,
  sendAiChat,
} from '@/services/aiApi';
import { AiChatMessage, AiNewsTickerInput, AiReportRequest } from '@/types/report';

const USAGE_KEY = ['ai', 'usage'];

/** 오늘 사용량을 서버에서 조회 */
export function useAiUsage() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: USAGE_KEY,
    queryFn: getAiUsage,
    enabled: !!user,
    staleTime: 60_000,
  });
}

const HISTORY_KEY = ['ai', 'history'];

/** AI 분석 요청 mutation — 성공 시 usage + history 캐시 무효화 */
export function useAiReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AiReportRequest) => analyzePortfolio(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** AI 개선 제안 요청 mutation */
export function useAiImprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AiReportRequest) => improvePortfolio(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** AI 분석 히스토리 조회 */
export function useAiHistory() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: getAiHistory,
    enabled: !!user,
    staleTime: 0,
  });
}

/** AI 뉴스 브리핑 mutation */
export function useAiNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tickers: AiNewsTickerInput[]) => fetchAiNews(tickers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** AI 채팅 mutation */
export function useAiChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { messages: AiChatMessage[]; holdings: AiReportRequest['holdings']; totalValueKrw: number; usdKrw: number }) =>
      sendAiChat(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** 세금 최적화 mutation */
export function useAiTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AiReportRequest) => getAiTax(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** 포트폴리오 건강점수 mutation */
export function useAiHealthScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AiReportRequest) => getAiHealthScore(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** 종목 발굴 mutation */
export function useAiDiscover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AiReportRequest) => getAiDiscover(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** 리밸런싱 실행 플랜 mutation */
export function useAiRebalancePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AiReportRequest) => getAiRebalancePlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** 환율 타이밍 분석 mutation */
export function useAiFxTiming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { currencies: string[]; rates: Record<string, number>; usdKrw: number }) =>
      getAiFxTiming(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USAGE_KEY });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** 리워드 광고 크레딧 청구 mutation */
export function useClaimRewardCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => claimRewardCredit(),
    onSuccess: () => qc.invalidateQueries({ queryKey: USAGE_KEY }),
  });
}
