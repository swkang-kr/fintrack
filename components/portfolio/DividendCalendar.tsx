import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HoldingWithPnL } from '@/types/portfolio';

interface Props {
  holdings: HoldingWithPnL[];
}

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'];

function formatKrw(v: number): string {
  if (v === 0) return '-';
  if (v >= 10000) return `₩${(v / 10000).toFixed(1)}만`;
  return '₩' + Math.round(v).toLocaleString('ko-KR');
}

export function DividendCalendar({ holdings }: Props) {
  const { monthlyData, annualTotal, byHolding } = useMemo(() => {
    const dividendHoldings = holdings.filter(
      (h) => h.dividend_rate && h.dividend_rate > 0
    );

    // 연간 배당금 및 종목별
    const annualTotal = dividendHoldings.reduce(
      (s, h) => s + (h.currentValue * (h.dividend_rate ?? 0)) / 100,
      0
    );

    const byHolding = dividendHoldings.map((h) => ({
      name: h.name,
      ticker: h.ticker,
      annual: (h.currentValue * (h.dividend_rate ?? 0)) / 100,
      monthly: (h.currentValue * (h.dividend_rate ?? 0)) / 1200,
      rate: h.dividend_rate ?? 0,
    }));

    // 월별 분포 (균등 가정 — 실제 지급 월 데이터 없으므로)
    const monthlyAmount = annualTotal / 12;
    const monthlyData = MONTH_NAMES.map((month, i) => ({
      month,
      amount: monthlyAmount,
      isCurrentMonth: i === new Date().getMonth(),
    }));

    return { monthlyData, annualTotal, byHolding };
  }, [holdings]);

  if (byHolding.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          배당수익률을 입력한 종목이 없습니다.{'\n'}
          종목 추가 시 배당수익률을 입력하세요.
        </Text>
      </View>
    );
  }

  const maxMonthly = Math.max(...monthlyData.map((m) => m.amount));

  return (
    <View style={styles.container}>
      {/* 연간 요약 */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>연간 예상 배당금</Text>
          <Text style={styles.summaryValue}>₩{Math.round(annualTotal).toLocaleString('ko-KR')}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryLabel}>월 평균</Text>
          <Text style={styles.summaryMontly}>₩{Math.round(annualTotal / 12).toLocaleString('ko-KR')}</Text>
        </View>
      </View>

      {/* 월별 바 차트 */}
      <View style={styles.calendarCard}>
        <Text style={styles.cardTitle}>월별 예상 배당금</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.barChart}>
            {monthlyData.map((m) => (
              <View key={m.month} style={styles.barCol}>
                <Text style={styles.barAmount}>
                  {m.amount > 0 ? formatKrw(m.amount) : ''}
                </Text>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (m.amount / maxMonthly) * 80),
                        backgroundColor: m.isCurrentMonth ? '#1A73E8' : '#BDD7FB',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, m.isCurrentMonth && styles.barLabelActive]}>
                  {m.month}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.note}>* 실제 배당 지급월은 종목마다 다를 수 있습니다</Text>
      </View>

      {/* 종목별 배당 */}
      <View style={styles.calendarCard}>
        <Text style={styles.cardTitle}>종목별 배당 내역</Text>
        {byHolding.map((h) => (
          <View key={h.ticker} style={styles.holdingRow}>
            <View style={styles.holdingLeft}>
              <Text style={styles.holdingName} numberOfLines={1}>{h.name}</Text>
              <Text style={styles.holdingRate}>배당수익률 {h.rate.toFixed(2)}%</Text>
            </View>
            <View style={styles.holdingRight}>
              <Text style={styles.holdingAnnual}>{formatKrw(h.annual)}/년</Text>
              <Text style={styles.holdingMonthly}>{formatKrw(h.monthly)}/월</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  empty: {
    padding: 32, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, margin: 16,
  },
  emptyText: { fontSize: 13, color: '#9AA0A6', textAlign: 'center', lineHeight: 20 },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1A73E8',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
  },
  summaryLeft: { flex: 1, gap: 4 },
  summaryRight: { alignItems: 'flex-end', gap: 4 },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summaryMontly: { fontSize: 15, fontWeight: '700', color: '#FFD740' },

  calendarCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginHorizontal: 16, gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingVertical: 4 },
  barCol: { alignItems: 'center', width: 38, gap: 2 },
  barAmount: { fontSize: 8, color: '#5F6368', textAlign: 'center' },
  barWrapper: { height: 80, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 4 },
  barLabel: { fontSize: 10, color: '#9AA0A6' },
  barLabelActive: { color: '#1A73E8', fontWeight: '700' },
  note: { fontSize: 10, color: '#9AA0A6' },

  holdingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F3F4',
  },
  holdingLeft: { flex: 1, gap: 2, marginRight: 12 },
  holdingName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  holdingRate: { fontSize: 11, color: '#9AA0A6' },
  holdingRight: { alignItems: 'flex-end', gap: 2 },
  holdingAnnual: { fontSize: 14, fontWeight: '700', color: '#34A853' },
  holdingMonthly: { fontSize: 11, color: '#5F6368' },
});
