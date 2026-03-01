const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const res = await fetch(`${API_BASE}/api/market/indices`);
  if (!res.ok) throw new Error('시장 지수 조회 실패');
  const data = await res.json();
  return data.indices ?? [];
}
