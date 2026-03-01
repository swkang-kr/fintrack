export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: string;
  portfolio_id: string;
  user_id: string;
  ticker: string;           // '005930', 'AAPL'
  name: string;             // '삼성전자', 'Apple Inc.'
  market: string;           // 'KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE', ...
  quantity: number;
  avg_price: number;        // 평균 매수가 (해당 통화 기준)
  currency: string;         // 'KRW' | 'USD'
  dividend_rate?: number;   // 연간 배당수익률 (%, 선택)
  created_at: string;
  updated_at: string;
}

export interface HoldingInput {
  portfolio_id: string;
  ticker: string;
  name: string;
  market: string;
  quantity: number;
  avg_price: number;
  currency: string;
  dividend_rate?: number;   // 연간 배당수익률 (%, 선택)
}

export interface StockQuote {
  yahooTicker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  name: string;
}

/** 수익률이 계산된 종목 */
export interface HoldingWithPnL extends Holding {
  yahooTicker: string;
  currentPrice: number;
  currentValue: number; // 평가금액 (KRW 환산)
  costBasis: number;    // 취득원가 (KRW 환산)
  pnl: number;          // 평가손익 (KRW)
  pnlPercent: number;   // 수익률 (%)
  quote: StockQuote | null;
}

/** 포트폴리오 요약 */
export interface PortfolioSummaryData {
  totalValue: number;   // 총 평가금액 (KRW)
  totalCost: number;    // 총 취득원가 (KRW)
  totalPnl: number;     // 총 평가손익 (KRW)
  totalPnlPercent: number;
  holdingCount: number;
}

/** 포트폴리오 스냅샷 (히스토리 차트용) */
export interface PortfolioSnapshot {
  snapshot_date: string;  // 'YYYY-MM-DD'
  total_value: number;
  total_cost: number;
  pnl_percent: number;
}
