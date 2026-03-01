import { Share } from 'react-native';
import { HoldingWithPnL, PortfolioSummaryData } from '@/types/portfolio';

/** CSV 텍스트 생성 후 Share.share()로 내보내기 */
export async function exportPortfolioCSV(
  holdings: HoldingWithPnL[],
  summary: PortfolioSummaryData,
  portfolioName: string
): Promise<void> {
  const header = '종목명,티커,시장,통화,수량,평균매수가,현재가,평가금액,취득원가,평가손익,수익률(%)';
  const rows = holdings.map((h) => {
    const pnlPct = h.pnlPercent.toFixed(2);
    return [
      h.name,
      h.ticker,
      h.market,
      h.currency,
      h.quantity,
      h.avg_price,
      h.currentPrice,
      Math.round(h.currentValue),
      Math.round(h.costBasis),
      Math.round(h.pnl),
      pnlPct,
    ].join(',');
  });

  const summaryLine = [
    `\n포트폴리오 요약:${portfolioName}`,
    `총 평가금액:₩${Math.round(summary.totalValue).toLocaleString('ko-KR')}`,
    `총 평가손익:₩${Math.round(summary.totalPnl).toLocaleString('ko-KR')}`,
    `수익률:${summary.totalPnlPercent.toFixed(2)}%`,
  ].join('\n');

  const csv = [header, ...rows, summaryLine].join('\n');

  await Share.share({
    message: csv,
    title: `FinTrack_${portfolioName}_포트폴리오.csv`,
  });
}
