const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface StockFundamentals {
  ticker: string;
  trailingPE: number | null;
  forwardPE: number | null;
  eps: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  beta: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  numberOfAnalystOpinions: number | null;
  recommendationKey: string | null;
}

export async function fetchFundamentals(yahooTicker: string): Promise<StockFundamentals> {
  const res = await fetch(
    `${API_BASE}/api/stocks/fundamentals?ticker=${encodeURIComponent(yahooTicker)}`
  );
  if (!res.ok) throw new Error('펀더멘털 조회 실패');
  const data = await res.json();
  const f = data.fundamentals ?? data; // 백엔드: { fundamentals: {...} }
  return {
    ticker:                 f.ticker,
    trailingPE:             f.trailingPE             ?? null,
    forwardPE:              f.forwardPE              ?? null,
    eps:                    f.epsTrailing            ?? f.eps ?? null,  // 백엔드 필드명 매핑
    fiftyTwoWeekHigh:       f.fiftyTwoWeekHigh       ?? null,
    fiftyTwoWeekLow:        f.fiftyTwoWeekLow        ?? null,
    marketCap:              f.marketCap              ?? null,
    dividendYield:          f.dividendYield          ?? null,
    beta:                   f.beta                   ?? null,
    targetMeanPrice:        f.targetMeanPrice        ?? null,
    targetHighPrice:        f.targetHighPrice        ?? null,
    targetLowPrice:         f.targetLowPrice         ?? null,
    numberOfAnalystOpinions: f.analystCount ?? f.numberOfAnalystOpinions ?? null,  // 백엔드 필드명 매핑
    recommendationKey:      f.recommendationKey      ?? null,
  };
}
