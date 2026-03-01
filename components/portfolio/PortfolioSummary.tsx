import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HoldingWithPnL, PortfolioSummaryData } from '@/types/portfolio';

interface Props {
  summary: PortfolioSummaryData;
  isFetching?: boolean;
  holdings?: HoldingWithPnL[];
}

const DOMESTIC_MARKETS = ['KOSPI', 'KOSDAQ'];

export function PortfolioSummary({ summary, isFetching, holdings = [] }: Props) {
  const { totalValue, totalCost, totalPnl, totalPnlPercent } = summary;
  const isUp = totalPnl >= 0;

  // 오늘 변동률 (보유 종목 가중 평균)
  const todayChange =
    totalValue > 0
      ? holdings.reduce((s, h) => {
          const w = h.currentValue / totalValue;
          return s + w * (h.quote?.changePercent ?? 0);
        }, 0)
      : null;
  const hasTodayData = holdings.some((h) => h.quote != null);
  const todayChangeDisplay = hasTodayData && todayChange !== null ? todayChange : null;

  // 국내/해외 분리 수익률
  const domestic = holdings.filter((h) => DOMESTIC_MARKETS.includes(h.market));
  const foreign = holdings.filter((h) => !DOMESTIC_MARKETS.includes(h.market));
  const domValue = domestic.reduce((s, h) => s + h.currentValue, 0);
  const forValue = foreign.reduce((s, h) => s + h.currentValue, 0);
  const domCost = domestic.reduce((s, h) => s + h.costBasis, 0);
  const forCost = foreign.reduce((s, h) => s + h.costBasis, 0);
  const domPnlPct = domCost > 0 ? ((domValue - domCost) / domCost) * 100 : null;
  const forPnlPct = forCost > 0 ? ((forValue - forCost) / forCost) * 100 : null;
  const showSplit = domestic.length > 0 && foreign.length > 0;

  // 연간 예상 배당금
  const annualDividend = holdings.reduce((s, h) => {
    if (!h.dividend_rate || h.dividend_rate <= 0) return s;
    return s + (h.currentValue * h.dividend_rate) / 100;
  }, 0);

  return (
    <View style={styles.card}>
      {/* 총 평가금액 */}
      <View style={styles.row}>
        <Text style={styles.label}>총 평가금액</Text>
        {isFetching && <Text style={styles.refreshing}>갱신 중...</Text>}
      </View>
      <Text style={styles.totalValue}>{formatKrw(totalValue)}</Text>

      {/* 취득원가 */}
      <Text style={styles.costLabel}>취득원가 {formatKrw(totalCost)}</Text>

      <View style={styles.divider} />

      {/* 총 손익 */}
      <View style={styles.pnlRow}>
        <Text style={styles.label}>평가손익</Text>
        <View style={styles.pnlRight}>
          <Text style={[styles.pnl, isUp ? styles.up : styles.down]}>
            {isUp ? '▲ +' : '▼ '}{formatKrw(Math.abs(totalPnl))}
          </Text>
          <Text style={[styles.pnlPct, isUp ? styles.up : styles.down]}>
            ({isUp ? '+' : ''}{totalPnlPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* 오늘 변동률 */}
      {todayChangeDisplay !== null && (
        <View style={styles.pnlRow}>
          <Text style={styles.label}>오늘 변동</Text>
          <Text style={[styles.todayChange, todayChangeDisplay >= 0 ? styles.up : styles.down]}>
            {todayChangeDisplay >= 0 ? '+' : ''}{todayChangeDisplay.toFixed(2)}%
          </Text>
        </View>
      )}

      {/* 국내/해외 분리 수익률 */}
      {showSplit && (
        <View style={styles.splitRow}>
          {domPnlPct !== null && (
            <View style={styles.splitItem}>
              <View style={[styles.splitDot, { backgroundColor: '#1A73E8' }]} />
              <Text style={styles.splitLabel}>국내</Text>
              <Text style={[styles.splitPnl, domPnlPct >= 0 ? styles.up : styles.down]}>
                {domPnlPct >= 0 ? '+' : ''}{domPnlPct.toFixed(1)}%
              </Text>
            </View>
          )}
          {forPnlPct !== null && (
            <View style={styles.splitItem}>
              <View style={[styles.splitDot, { backgroundColor: '#34A853' }]} />
              <Text style={styles.splitLabel}>해외</Text>
              <Text style={[styles.splitPnl, forPnlPct >= 0 ? styles.up : styles.down]}>
                {forPnlPct >= 0 ? '+' : ''}{forPnlPct.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 연간 예상 배당금 */}
      {annualDividend > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.pnlRow}>
            <Text style={styles.label}>연간 예상 배당금</Text>
            <Text style={styles.dividendValue}>{formatKrw(annualDividend)}</Text>
          </View>
          <Text style={styles.dividendYield}>
            배당수익률 {((annualDividend / totalValue) * 100).toFixed(2)}%
          </Text>
        </>
      )}
    </View>
  );
}

function formatKrw(value: number): string {
  return '₩' + Math.round(value).toLocaleString('ko-KR');
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 13, color: '#9AA0A6', fontWeight: '500' },
  refreshing: { fontSize: 11, color: '#1A73E8' },
  totalValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  costLabel: {
    fontSize: 12,
    color: '#9AA0A6',
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: '#F1F3F4', marginVertical: 12 },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnlRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pnl: { fontSize: 16, fontWeight: '700' },
  pnlPct: { fontSize: 13, fontWeight: '600' },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },
  todayChange: { fontSize: 13, fontWeight: '700' },

  // 국내/해외 분리
  splitRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  splitItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  splitDot: { width: 8, height: 8, borderRadius: 4 },
  splitLabel: { fontSize: 12, color: '#5F6368' },
  splitPnl: { fontSize: 12, fontWeight: '700' },

  // 배당금
  dividendValue: { fontSize: 15, fontWeight: '700', color: '#34A853' },
  dividendYield: { fontSize: 11, color: '#9AA0A6', textAlign: 'right', marginTop: 2 },
});
