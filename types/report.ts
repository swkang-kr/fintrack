export interface AiReportSection {
  summary: string;
  insights: string[];
  risks: string[];
  recommendation: string;
}

export interface AiReportResponse {
  report: AiReportSection;
  usedToday: number;
  limitPerDay: number;
}

export interface AiImprovementItem {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

export interface AiImproveSection {
  summary: string;
  improvements: AiImprovementItem[];
  rebalancing: string;
}

export interface AiImproveResponse {
  report: AiImproveSection;
  usedToday: number;
  limitPerDay: number;
}

export interface AiReportHoldingInput {
  name: string;
  ticker: string;
  market: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  currency: string;
  pnlPercent: number | null;
  valueKrw: number;
}

export interface AiReportRequest {
  holdings: AiReportHoldingInput[];
  totalValueKrw: number;
  totalPnlPercent: number;
  usdKrw: number;
}

/** AI 히스토리 */
export type AiReportType = 'analyze' | 'improve' | 'news' | 'chat' | 'tax' | 'health-score' | 'discover' | 'rebalance-plan' | 'fx-timing';

export interface AiHistoryItem {
  id: string;
  created_at: string;
  report_data: (AiReportSection | AiImproveSection | { briefing: AiNewsItem[]; overview: string }) & { _type?: AiReportType };
}

/** AI 뉴스 브리핑 */
export interface AiNewsTickerInput {
  ticker: string;
  name: string;
  yahooTicker: string;
}

export interface AiNewsItem {
  ticker: string;
  name: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  headlines: string[];
}

export interface AiNewsResponse {
  briefing: AiNewsItem[];
  overview: string;
  usedToday: number;
  limitPerDay: number;
}

// ─── 사용량 (bonus 포함) ───────────────────────────────────
export interface AiUsageResponse {
  usedToday: number;
  limitPerDay: number;
  bonusToday: number;
  effectiveLimit: number;
}

// ─── AI 채팅 ──────────────────────────────────────────────
export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  message: string;
  usedToday: number;
  limitPerDay: number;
  bonusToday: number;
}

// ─── 세금 최적화 ──────────────────────────────────────────
export interface AiTaxStrategy {
  title: string;
  description: string;
  action: string;
  saving: number;
}

export interface AiTaxResult {
  currentTax: number;
  optimizedTax: number;
  saving: number;
  strategies: AiTaxStrategy[];
  disclaimer: string;
}

export interface AiTaxResponse {
  report: AiTaxResult;
  usedToday: number;
  limitPerDay: number;
  bonusToday: number;
}

// ─── 건강점수 ─────────────────────────────────────────────
export interface AiHealthScoreFactor {
  name: string;
  score: number;
  comment: string;
}

export interface AiHealthScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: AiHealthScoreFactor[];
  summary: string;
}

export interface AiHealthScoreResponse {
  report: AiHealthScore;
  usedToday: number;
  limitPerDay: number;
  bonusToday: number;
}

// ─── 종목 발굴 ────────────────────────────────────────────
export interface AiDiscoverRecommendation {
  ticker: string;
  name: string;
  market: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  expectedReturn: string;
}

export interface AiDiscoverResult {
  recommendations: AiDiscoverRecommendation[];
  strategy: string;
}

export interface AiDiscoverResponse {
  report: AiDiscoverResult;
  usedToday: number;
  limitPerDay: number;
  bonusToday: number;
}

// ─── 리밸런싱 실행 플랜 ───────────────────────────────────
export interface AiRebalancePlanStep {
  step: number;
  action: 'buy' | 'sell';
  ticker: string;
  name: string;
  quantity: number;
  estimatedAmount: number;
  reason: string;
}

export interface AiRebalancePlanResult {
  steps: AiRebalancePlanStep[];
  summary: string;
  totalTransactions: number;
}

export interface AiRebalancePlanResponse {
  report: AiRebalancePlanResult;
  usedToday: number;
  limitPerDay: number;
  bonusToday: number;
}

// ─── 환율 타이밍 ──────────────────────────────────────────
export interface AiFxTimingTarget {
  level: number;
  action: 'buy' | 'sell' | 'wait';
  confidence: 'high' | 'medium' | 'low';
}

export interface AiFxTimingResult {
  currency: string;
  currentRate: number;
  recommendation: 'buy' | 'sell' | 'wait';
  timing: string;
  analysis: string;
  targets: AiFxTimingTarget[];
}

export interface AiFxTimingAnalyses {
  analyses: AiFxTimingResult[];
  overview: string;
}

export interface AiFxTimingResponse {
  report: AiFxTimingAnalyses;
  usedToday: number;
  limitPerDay: number;
  bonusToday: number;
}

// ─── 크레딧 ───────────────────────────────────────────────
export interface AiCreditsResponse {
  bonusToday: number;
  message: string;
}
