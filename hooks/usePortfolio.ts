import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useExchangeRates } from './useExchangeRates';
import { useAuthStore } from '@/stores/authStore';
import { usePortfolioStore } from '@/stores/portfolioStore';
import {
  addHolding,
  createPortfolio,
  deletePortfolio,
  deleteHolding,
  fetchPortfolioHistory,
  getHoldings,
  getPortfolios,
  getOrCreatePortfolio,
  updateHolding,
} from '@/services/portfolioApi';
import { fetchHoldingQuotes, toYahooTicker } from '@/services/stockApi';
import {
  Holding,
  HoldingInput,
  HoldingWithPnL,
  PortfolioSnapshot,
  PortfolioSummaryData,
} from '@/types/portfolio';

const ONE_MIN = 60_000;
const FIVE_MIN = 5 * ONE_MIN;

// ── 전체 포트폴리오 목록 ──────────────────────────────────

export function usePortfolios() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['portfolios', user?.id],
    queryFn: async () => {
      const list = await getPortfolios(user!.id);
      if (list.length === 0) {
        const created = await getOrCreatePortfolio(user!.id);
        return [created];
      }
      return list;
    },
    enabled: !!user,
    staleTime: FIVE_MIN,
  });
}

// ── 선택된 포트폴리오 ─────────────────────────────────────

export function usePortfolio() {
  const { selectedPortfolioId } = usePortfolioStore();
  const portfoliosQuery = usePortfolios();
  const portfolios = portfoliosQuery.data ?? [];
  const selected = portfolios.find((p) => p.id === selectedPortfolioId) ?? portfolios[0] ?? null;

  return {
    ...portfoliosQuery,
    data: selected,
  };
}

// ── 포트폴리오 생성/삭제 ──────────────────────────────────

export function useCreatePortfolio() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { setSelectedPortfolioId } = usePortfolioStore();

  return useMutation({
    mutationFn: (name: string) => createPortfolio(user!.id, name),
    onSuccess: (portfolio) => {
      qc.invalidateQueries({ queryKey: ['portfolios'] });
      setSelectedPortfolioId(portfolio.id);
    },
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  const { selectedPortfolioId, setSelectedPortfolioId } = usePortfolioStore();

  return useMutation({
    mutationFn: (id: string) => deletePortfolio(id),
    onSuccess: (_data, id) => {
      if (id === selectedPortfolioId) setSelectedPortfolioId(null);
      qc.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

// ── 종목 목록 + 현재가 조회 ───────────────────────────────

export function useHoldingsWithPnL() {
  const { data: portfolio } = usePortfolio();
  const { data: rates } = useExchangeRates();
  const usdKrw = rates?.rates.USD ?? 1350;

  // 1) holdings from Supabase
  const holdingsQuery = useQuery({
    queryKey: ['holdings', portfolio?.id],
    queryFn: () => getHoldings(portfolio!.id),
    enabled: !!portfolio,
    staleTime: ONE_MIN,
  });

  const holdings = holdingsQuery.data ?? [];

  // 2) current quotes from backend
  const quotesQuery = useQuery({
    queryKey: ['quotes', holdings.map((h) => `${h.ticker}:${h.market}`).join(',')],
    queryFn: () => fetchHoldingQuotes(holdings),
    enabled: holdings.length > 0,
    staleTime: ONE_MIN,
    refetchInterval: ONE_MIN,
  });

  // 3) PnL 계산 (KRW 기준 환산)
  const holdingsWithPnL: HoldingWithPnL[] = useMemo(() => {
    const quotes = quotesQuery.data ?? {};

    return holdings.map((h) => {
      const yahooTicker = toYahooTicker(h.ticker, h.market);
      const quote = quotes[yahooTicker] ?? null;

      const rawPrice = quote?.price ?? h.avg_price;
      const currentPrice = Number(rawPrice) || 0;
      const quantity = Number(h.quantity) || 0;
      const avgPrice = Number(h.avg_price) || 0;
      const multiplier = h.currency === 'USD' ? usdKrw : 1;

      const currentValue = currentPrice * quantity * multiplier;
      const costBasis = avgPrice * quantity * multiplier;
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        ...h,
        yahooTicker,
        currentPrice,
        currentValue,
        costBasis,
        pnl,
        pnlPercent,
        quote,
      };
    });
  }, [holdings, quotesQuery.data, usdKrw]);

  // 4) 포트폴리오 요약
  const summary: PortfolioSummaryData = useMemo(() => {
    const totalValue = holdingsWithPnL.reduce((s, h) => s + h.currentValue, 0);
    const totalCost = holdingsWithPnL.reduce((s, h) => s + h.costBasis, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      holdingCount: holdingsWithPnL.length,
    };
  }, [holdingsWithPnL]);

  return {
    holdings: holdingsWithPnL,
    summary,
    isLoading: holdingsQuery.isLoading,
    isError: holdingsQuery.isError,
    isFetching: holdingsQuery.isFetching || quotesQuery.isFetching,
    refetch: holdingsQuery.refetch,
  };
}

// ── 종목 CRUD 뮤테이션 ────────────────────────────────────

export function useAddHolding() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (input: HoldingInput) => addHolding(user!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  });
}

export function useUpdateHolding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Pick<Holding, 'quantity' | 'avg_price'> }) =>
      updateHolding(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteHolding(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  });
}

// ── 포트폴리오 히스토리 (차트용) ──────────────────────────

export function usePortfolioHistory(portfolioId: string | undefined, range: string) {
  return useQuery<PortfolioSnapshot[]>({
    queryKey: ['portfolio-history', portfolioId, range],
    queryFn: () => fetchPortfolioHistory(portfolioId!, range),
    enabled: !!portfolioId,
    staleTime: 10 * ONE_MIN,
  });
}
