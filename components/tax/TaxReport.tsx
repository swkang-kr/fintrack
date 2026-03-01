import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HoldingWithPnL } from '@/types/portfolio';

interface Props {
  holdings: HoldingWithPnL[];
  usdKrw: number;
}

const FOREIGN_TAX_RATE = 0.22;         // 해외주식 양도세 22%
const FOREIGN_DEDUCTION = 2_500_000;   // 기본공제 250만원
const DIVIDEND_TAX_RATE = 0.154;       // 배당소득세 15.4%
const COMPREHENSIVE_THRESHOLD = 20_000_000; // 금융종합과세 기준 2,000만원

const RECOMMENDATION_MAP: Record<string, string> = {
  strongBuy: '강력 매수',
  buy: '매수',
  hold: '보유',
  sell: '매도',
  strongSell: '강력 매도',
};

function formatKrw(v: number): string {
  return '₩' + Math.round(Math.abs(v)).toLocaleString('ko-KR');
}

export function TaxReport({ holdings, usdKrw }: Props) {
  const { foreignGain, foreignTax, dividendIncome, dividendTax, comprehensiveRisk } =
    useMemo(() => {
      // 해외 미실현 수익 (KRW 환산) — 실현 이익 데이터가 없으므로 미실현 기준 표시
      const foreignHoldings = holdings.filter(
        (h) => h.market !== 'KOSPI' && h.market !== 'KOSDAQ'
      );
      const foreignGain = foreignHoldings.reduce((s, h) => s + Math.max(0, h.pnl), 0);

      const taxBase = Math.max(0, foreignGain - FOREIGN_DEDUCTION);
      const foreignTax = taxBase * FOREIGN_TAX_RATE;

      // 연간 예상 배당금 (KRW)
      const dividendIncome = holdings.reduce((s, h) => {
        if (!h.dividend_rate || h.dividend_rate <= 0) return s;
        return s + (h.currentValue * h.dividend_rate) / 100;
      }, 0);
      const dividendTax = dividendIncome * DIVIDEND_TAX_RATE;

      // 금융종합과세 위험
      const totalFinancialIncome = dividendIncome + Math.max(0, foreignGain - FOREIGN_DEDUCTION);
      const comprehensiveRisk = Math.min(1, totalFinancialIncome / COMPREHENSIVE_THRESHOLD);

      return { foreignGain, foreignTax, dividendIncome, dividendTax, comprehensiveRisk };
    }, [holdings, usdKrw]);

  const riskColor = comprehensiveRisk > 0.8 ? '#E53935' : comprehensiveRisk > 0.5 ? '#FB8C00' : '#34A853';

  return (
    <View style={styles.container}>
      {/* 해외주식 양도소득세 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 해외주식 양도소득세 (미실현 기준)</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>미실현 수익</Text>
          <Text style={styles.rowValue}>{formatKrw(foreignGain)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>기본공제</Text>
          <Text style={[styles.rowValue, styles.deduction]}>- ₩2,500,000</Text>
        </View>
        <View style={[styles.row, styles.divider]}>
          <Text style={styles.rowLabel}>과세표준</Text>
          <Text style={styles.rowValue}>
            {formatKrw(Math.max(0, foreignGain - FOREIGN_DEDUCTION))}
          </Text>
        </View>
        <View style={[styles.row, styles.taxRow]}>
          <Text style={styles.taxLabel}>예상 세금 (22%)</Text>
          <Text style={styles.taxValue}>{formatKrw(foreignTax)}</Text>
        </View>
        <Text style={styles.note}>
          * 매도 전 미실현 수익 기준 / 실제 세금은 매도 시점 수익으로 계산
        </Text>
      </View>

      {/* 배당소득세 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 배당소득세</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>연간 예상 배당금</Text>
          <Text style={styles.rowValue}>{formatKrw(dividendIncome)}</Text>
        </View>
        <View style={[styles.row, styles.taxRow]}>
          <Text style={styles.taxLabel}>원천징수 (15.4%)</Text>
          <Text style={styles.taxValue}>{formatKrw(dividendTax)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>실수령 배당금</Text>
          <Text style={[styles.rowValue, { color: '#34A853', fontWeight: '700' }]}>
            {formatKrw(dividendIncome - dividendTax)}
          </Text>
        </View>
      </View>

      {/* 금융소득종합과세 위험 */}
      <View style={styles.card}>
        <View style={styles.comprehensiveHeader}>
          <Text style={styles.cardTitle}>⚠️ 금융소득종합과세 위험도</Text>
          <Text style={[styles.riskPct, { color: riskColor }]}>
            {(comprehensiveRisk * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, comprehensiveRisk * 100)}%` as `${number}%`,
                backgroundColor: riskColor,
              },
            ]}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>금융소득</Text>
          <Text style={styles.rowValue}>
            {formatKrw(dividendIncome)} / ₩20,000,000
          </Text>
        </View>
        {comprehensiveRisk > 0.7 && (
          <Text style={[styles.note, { color: '#E53935' }]}>
            금융소득이 기준액(2,000만원)에 근접합니다. 절세 전략을 검토하세요.
          </Text>
        )}
      </View>

      <Text style={styles.disclaimer}>
        본 계산은 참고용이며 실제 세금과 다를 수 있습니다.{'\n'}
        정확한 세금 신고는 세무사와 상담하세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: '#5F6368' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  deduction: { color: '#1565C0' },
  divider: {
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F3F4', marginTop: 2,
  },
  taxRow: {
    backgroundColor: '#FFF8F0', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 8, marginHorizontal: -2,
  },
  taxLabel: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  taxValue: { fontSize: 16, fontWeight: '800', color: '#E65100' },
  note: { fontSize: 11, color: '#9AA0A6', lineHeight: 16, marginTop: 2 },
  comprehensiveHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  riskPct: { fontSize: 18, fontWeight: '800' },
  progressBg: { height: 8, backgroundColor: '#F1F3F4', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  disclaimer: {
    fontSize: 11, color: '#9AA0A6', textAlign: 'center', lineHeight: 17,
  },
});
