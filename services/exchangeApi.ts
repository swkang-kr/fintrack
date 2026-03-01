const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type CurrencyCode = 'USD' | 'EUR' | 'JPY' | 'CNY';
export type CurrencyPair = 'USD/KRW' | 'EUR/KRW' | 'JPY/KRW' | 'CNY/KRW';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  JPY: number;
  CNY: number;
}

export interface ExchangeRatesResponse {
  rates: ExchangeRates;
  updatedAt: string;
  source: 'bok' | 'frankfurter';
}

export interface RateHistoryItem {
  date: string;
  rate: number;
}

export interface RateHistoryResponse {
  pair: string;
  data: RateHistoryItem[];
}

export async function fetchExchangeRates(): Promise<ExchangeRatesResponse> {
  const res = await fetch(`${API_BASE}/api/exchange/rates`);
  if (!res.ok) throw new Error(`exchange rates fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchRateHistory(
  pair: CurrencyPair,
  days: number = 30
): Promise<RateHistoryResponse> {
  const res = await fetch(
    `${API_BASE}/api/exchange/history?pair=${encodeURIComponent(pair)}&days=${days}`
  );
  if (!res.ok) throw new Error(`rate history fetch failed: ${res.status}`);
  return res.json();
}
