import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { usePortfolioHistory } from '@/hooks/usePortfolio';

interface Props {
  portfolioId: string | undefined;
  currentValue: number;
  totalCost: number;
}

type Range = '1W' | '1M' | '3M';

const RANGES: { key: Range; label: string }[] = [
  { key: '1W', label: '1주' },
  { key: '1M', label: '1달' },
  { key: '3M', label: '3달' },
];

const CHART_WIDTH = Dimensions.get('window').width - 32;

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

export function PortfolioHistoryChart({ portfolioId, currentValue, totalCost }: Props) {
  const [range, setRange] = useState<Range>('1M');
  const { data: snapshots, isLoading } = usePortfolioHistory(portfolioId, range);

  // 오늘 현재가를 마지막 포인트로 추가 (중복 방지)
  const hasToday = (snapshots ?? []).some((s) => s.snapshot_date === today);
  const todayPoint = !hasToday ? [{ snapshot_date: today, total_value: currentValue, total_cost: totalCost, pnl_percent: 0 }] : [];

  // 스냅샷이 없으면 매입가 기준 합성 시작점 생성
  const syntheticStart = (snapshots ?? []).length === 0 && totalCost > 0
    ? [{ snapshot_date: yesterday, total_value: totalCost, total_cost: totalCost, pnl_percent: 0 }]
    : [];

  const allPoints = [...syntheticStart, ...(snapshots ?? []), ...todayPoint];

  const hasData = allPoints.length >= 2;

  if (!portfolioId) return null;

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>자산 성장 히스토리</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>자산 성장 히스토리</Text>
        <View style={styles.placeholder}>
          <Text style={styles.noDataIcon}>📈</Text>
          <Text style={styles.noDataTitle}>데이터 수집 중</Text>
          <Text style={styles.noDataDesc}>
            매일 자정 포트폴리오 가치가 기록됩니다.{'\n'}내일부터 차트가 표시됩니다.
          </Text>
        </View>
      </View>
    );
  }

  const values = allPoints.map((s) => Math.round(s.total_value));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range2 = maxVal - minVal;
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const changeAmt = lastVal - firstVal;
  const changePct = firstVal > 0 ? (changeAmt / firstVal) * 100 : 0;
  const isUp = changeAmt >= 0;

  // 레이블: 데이터 포인트가 많으면 일부만 표시
  const step = Math.max(1, Math.floor(allPoints.length / 4));
  const labels = allPoints.map((s, i) => {
    if (i === 0 || i === allPoints.length - 1 || i % step === 0) {
      const d = new Date(s.snapshot_date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    return '';
  });

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>자산 성장 히스토리</Text>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <Pressable
              key={r.key}
              style={[styles.rangeBtn, range === r.key && styles.rangeBtnActive]}
              onPress={() => setRange(r.key)}
            >
              <Text style={[styles.rangeBtnText, range === r.key && styles.rangeBtnTextActive]}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 변동 요약 */}
      <View style={styles.summary}>
        <Text style={styles.currentVal}>
          ₩{Math.round(currentValue).toLocaleString('ko-KR')}
        </Text>
        <Text style={[styles.changePct, isUp ? styles.up : styles.down]}>
          {isUp ? '▲ +' : '▼ '}
          {Math.abs(changePct).toFixed(1)}%
          {'  '}
          {isUp ? '+' : '-'}₩{Math.abs(changeAmt).toLocaleString('ko-KR')}
        </Text>
      </View>

      {/* 차트 */}
      <LineChart
        data={{
          labels,
          datasets: [{ data: values }],
        }}
        width={CHART_WIDTH}
        height={160}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={true}
        withHorizontalLabels={false}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: () => (isUp ? '#E53935' : '#1565C0'),
          labelColor: () => '#9AA0A6',
          style: { borderRadius: 8 },
          propsForLabels: { fontSize: 10 },
        }}
        bezier
        style={styles.chart}
        fromZero={false}
        yAxisInterval={1}
        segments={3}
        formatYLabel={() => ''}
      />

      {/* 범위 표시 */}
      <View style={styles.rangeInfo}>
        <Text style={styles.rangeInfoText}>
          최저 ₩{minVal.toLocaleString('ko-KR')}
        </Text>
        <Text style={styles.rangeInfoText}>
          최고 ₩{maxVal.toLocaleString('ko-KR')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  rangeRow: { flexDirection: 'row', gap: 4 },
  rangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F3F4',
  },
  rangeBtnActive: { backgroundColor: '#1A73E8' },
  rangeBtnText: { fontSize: 12, fontWeight: '600', color: '#5F6368' },
  rangeBtnTextActive: { color: '#fff' },

  summary: { marginBottom: 8 },
  currentVal: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  changePct: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },

  chart: { marginLeft: -16, borderRadius: 8 },

  rangeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeInfoText: { fontSize: 11, color: '#9AA0A6' },

  placeholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: { fontSize: 13, color: '#9AA0A6' },
  noDataIcon: { fontSize: 32 },
  noDataTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  noDataDesc: { fontSize: 12, color: '#9AA0A6', textAlign: 'center', lineHeight: 18 },
});
