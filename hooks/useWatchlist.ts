import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  WatchlistInput,
} from '@/services/watchlistApi';
import { fetchHoldingQuotes, toYahooTicker } from '@/services/stockApi';
import { useAuth } from './useAuth';

const KEY = ['watchlist'];

export function useWatchlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY,
    queryFn: fetchWatchlist,
    enabled: !!user,
  });
}

export interface WatchlistWithQuote {
  id: string;
  ticker: string;
  name: string;
  market: string;
  currency: string;
  yahooTicker: string;
  currentPrice?: number;
  changePercent?: number;
  change?: number;
}

/** 관심종목 + 현재가 통합 조회 */
export function useWatchlistWithQuotes() {
  const { data: items = [], isLoading: isLoadingList } = useWatchlist();

  const quoteQuery = useQuery({
    queryKey: [...KEY, 'quotes', items.map((i) => i.ticker + i.market).join(',')],
    queryFn: () => fetchHoldingQuotes(items),
    enabled: items.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const combined: WatchlistWithQuote[] = items.map((item) => {
    const yahooTicker = toYahooTicker(item.ticker, item.market);
    const quote = quoteQuery.data?.[yahooTicker];
    return {
      ...item,
      yahooTicker,
      currentPrice: quote?.price,
      changePercent: quote?.changePercent,
      change: quote?.change,
    };
  });

  return {
    items: combined,
    isLoading: isLoadingList || quoteQuery.isLoading,
  };
}

export function useAddWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WatchlistInput) => addToWatchlist(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFromWatchlist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
