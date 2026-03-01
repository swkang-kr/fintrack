import { Holding, StockQuote } from '@/types/portfolio';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/** market + ticker → Yahoo Finance 티커 변환 */
export function toYahooTicker(ticker: string, market: string): string {
  if (market === 'KOSPI') return `${ticker}.KS`;
  if (market === 'KOSDAQ') return `${ticker}.KQ`;
  return ticker;
}

/** 종목 목록 기준으로 현재가 일괄 조회 */
export async function fetchHoldingQuotes(
  holdings: Pick<Holding, 'ticker' | 'market'>[]
): Promise<Record<string, StockQuote>> {
  if (holdings.length === 0) return {};

  const tickers = holdings
    .map((h) => toYahooTicker(h.ticker, h.market))
    .join(',');

  const res = await fetch(`${API_BASE}/api/stocks/quote?tickers=${encodeURIComponent(tickers)}`);
  if (!res.ok) throw new Error('주가 조회 실패');

  const json: { quotes: Record<string, StockQuote> } = await res.json();
  return json.quotes;
}

/** 단일 종목 현재가 조회 (yahooTicker 형식: 005930.KS, AAPL 등) */
export async function fetchSingleQuote(yahooTicker: string): Promise<StockQuote | null> {
  const res = await fetch(`${API_BASE}/api/stocks/quote?tickers=${encodeURIComponent(yahooTicker)}`);
  if (!res.ok) return null;
  const json: { quotes: Record<string, StockQuote> } = await res.json();
  return json.quotes[yahooTicker] ?? null;
}

/** 종목 검색 */
export interface StockSearchResult {
  yahooTicker: string;
  ticker: string;
  name: string;
  market: string;
  currency: string;
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${API_BASE}/api/stocks/search?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const json: { results: StockSearchResult[] } = await res.json();
  return json.results;
}
