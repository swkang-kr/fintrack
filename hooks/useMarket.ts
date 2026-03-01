import { useQuery } from '@tanstack/react-query';
import { fetchMarketIndices } from '@/services/marketApi';

export function useMarketIndices() {
  return useQuery({
    queryKey: ['market', 'indices'],
    queryFn: fetchMarketIndices,
    staleTime: 5 * 60 * 1000,       // 5분
    refetchInterval: 5 * 60 * 1000, // 5분마다 자동 갱신
    retry: 1,
  });
}
