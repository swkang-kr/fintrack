import { useQueries, useQuery } from '@tanstack/react-query';
import {
  CurrencyCode,
  CurrencyPair,
  fetchExchangeRates,
  fetchRateHistory,
} from '@/services/exchangeApi';

const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const ALL_PAIRS: CurrencyPair[] = ['USD/KRW', 'EUR/KRW', 'JPY/KRW', 'CNY/KRW'];

/** 현재 환율 (5분 캐시, 5분마다 자동 갱신) */
export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange', 'rates'],
    queryFn: fetchExchangeRates,
    staleTime: FIVE_MIN,
    refetchInterval: FIVE_MIN,
  });
}

/** 특정 통화 30일 히스토리 (차트용, 1시간 캐시) */
export function useRateHistory(pair: CurrencyPair, days = 30) {
  return useQuery({
    queryKey: ['exchange', 'history', pair, days],
    queryFn: () => fetchRateHistory(pair, days),
    staleTime: ONE_HOUR,
  });
}

/**
 * 4개 통화 전일 대비 변동폭 (RateCard ▲▼ 표시용)
 * 3일치 히스토리를 병렬 조회 → 마지막 두 거래일 차이 계산
 */
export function useRateChanges(): {
  changes: Partial<Record<CurrencyCode, number>>;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: ALL_PAIRS.map((pair) => ({
      queryKey: ['exchange', 'history', pair, 3],
      queryFn: () => fetchRateHistory(pair, 3),
      staleTime: FIVE_MIN,
    })),
  });

  const changes: Partial<Record<CurrencyCode, number>> = {};
  ALL_PAIRS.forEach((pair, i) => {
    const rows = results[i].data?.data;
    if (rows && rows.length >= 2) {
      const currency = pair.split('/')[0] as CurrencyCode;
      changes[currency] = rows[rows.length - 1].rate - rows[rows.length - 2].rate;
    }
  });

  return {
    changes,
    isLoading: results.some((r) => r.isLoading),
  };
}
