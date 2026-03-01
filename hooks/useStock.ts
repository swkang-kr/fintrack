import { useQuery } from '@tanstack/react-query';
import { fetchSingleQuote, searchStocks } from '@/services/stockApi';

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ['stocks', 'search', query],
    queryFn: () => searchStocks(query),
    enabled: query.trim().length >= 1,
    staleTime: 60_000,
  });
}

export function useStockQuote(yahooTicker: string | null) {
  return useQuery({
    queryKey: ['stocks', 'quote', yahooTicker],
    queryFn: () => fetchSingleQuote(yahooTicker!),
    enabled: !!yahooTicker,
    staleTime: 60_000,
  });
}
