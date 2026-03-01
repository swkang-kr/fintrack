import { useQuery } from '@tanstack/react-query';
import { fetchFundamentals, StockFundamentals } from '@/services/fundamentalsApi';

const ONE_HOUR = 60 * 60 * 1000;

export function useFundamentals(yahooTicker: string | null) {
  return useQuery<StockFundamentals>({
    queryKey: ['fundamentals', yahooTicker],
    queryFn: () => fetchFundamentals(yahooTicker!),
    enabled: !!yahooTicker,
    staleTime: ONE_HOUR,
  });
}
