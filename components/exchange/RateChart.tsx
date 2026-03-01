import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRateHistory } from '@/hooks/useExchangeRates';
import { CurrencyCode, CurrencyPair } from '@/services/exchangeApi';

interface RateChartProps {
  currency: CurrencyCode;
}

export function RateChart({ currency }: RateChartProps) {
  const { width } = useWindowDimensions();
  const pair = `${currency}/KRW` as CurrencyPair;
  const { data, isLoading, isError } = useRateHistory(pair, 30);

  if (isLoading) {
    return (
      <View style={[styles.placeholder, { width: width - 32 }]}>
        <ActivityIndicator size="small" color="#1A73E8" />
      </View>
    );
  }

  if (isError || !data || data.data.length < 2) {
    return (
      <View style={[styles.placeholder, { width: width - 32 }]}>
        <Text style={styles.emptyText}>차트 데이터를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const rows = data.data;
  const values = rows.map((d) => d.rate);
  // 데이터 포인트 수와 같은 길이의 레이블 배열, 5개만 날짜 표시
  const labels = buildLabels(rows.map((d) => d.date), 5);

  const decimals = currency === 'JPY' ? 4 : 0;
  const chartWidth = width - 32;

  return (
    <View style={styles.container}>
      <LineChart
        data={{ labels, datasets: [{ data: values }] }}
        width={chartWidth}
        height={180}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: decimals,
          color: (opacity = 1) => `rgba(26, 115, 232, ${opacity})`,
          labelColor: () => '#9AA0A6',
          style: { borderRadius: 12 },
          propsForBackgroundLines: {
            stroke: '#F1F3F4',
            strokeDasharray: '',
          },
        }}
        bezier
        withDots={false}
        withInnerLines={true}
        withOuterLines={false}
        withShadow={false}
        style={styles.chart}
      />
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>
          최저 {formatValue(Math.min(...values), currency)}
        </Text>
        <Text style={styles.rangeText}>
          최고 {formatValue(Math.max(...values), currency)}
        </Text>
      </View>
    </View>
  );
}

function buildLabels(dates: string[], visibleCount: number): string[] {
  const n = dates.length;
  if (n <= visibleCount) return dates.map(formatDate);

  const step = (n - 1) / (visibleCount - 1);
  const visibleIndices = new Set(
    Array.from({ length: visibleCount }, (_, i) => Math.round(i * step))
  );

  return dates.map((date, i) => (visibleIndices.has(i) ? formatDate(date) : ''));
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function formatValue(value: number, currency: CurrencyCode): string {
  const decimals = currency === 'JPY' ? 4 : 2;
  const fixed = value.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chart: {
    borderRadius: 12,
  },
  placeholder: {
    height: 180,
    marginHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  rangeText: {
    fontSize: 11,
    color: '#9AA0A6',
  },
});
