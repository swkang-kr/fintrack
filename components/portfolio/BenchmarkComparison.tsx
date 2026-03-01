import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMarketIndices } from '@/hooks/useMarket';
import { PortfolioSummaryData, HoldingWithPnL } from '@/types/portfolio';

interface Props {
  summary: PortfolioSummaryData;
  holdings: HoldingWithPnL[];
}

function PctBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.abs((value / max) * 100));
  const isUp = value >= 0;
  return (
    <View style={styles.barBg}>
      <View
        style={[
          styles.barFill,
          { width: `${pct}%` as `${number}%`, backgroundColor: isUp ? '#E53935' : '#1565C0' },
        ]}
      />
    </View>
  );
}

export function BenchmarkComparison({ summary, holdings }: Props) {
  const { data: indices = [], isLoading } = useMarketIndices();

  // 내 포트폴리오 오늘 변동률 (보유 종목 평균 가중 변동률)
  const totalValue = summary.totalValue;
  const myTodayChange =
    totalValue > 0
      ? holdings.reduce((s, h) => {
          const w = h.currentValue / totalValue;
          const cp = h.quote?.changePercent ?? 0;
          return s + w * cp;
        }, 0)
      : 0;

  const rows = [
    { name: '내 포트폴리오', changePercent: myTodayChange, highlight: true },
    ...indices.map((idx) => ({
      name: idx.name,
      changePercent: idx.changePercent,
      highlight: false,
    })),
  ];

  const maxAbs = Math.max(0.1, ...rows.map((r) => Math.abs(r.changePercent)));

  if (isLoading) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>오늘 수익률 비교</Text>
      {rows.map((row) => {
        const isUp = row.changePercent >= 0;
        return (
          <View key={row.name} style={[styles.row, row.highlight && styles.rowHighlight]}>
            <Text style={[styles.rowName, row.highlight && styles.rowNameHighlight]}>
              {row.name}
            </Text>
            <View style={styles.barArea}>
              <PctBar value={row.changePercent} max={maxAbs} />
            </View>
            <Text style={[styles.rowPct, isUp ? styles.up : styles.down]}>
              {isUp ? '+' : ''}{row.changePercent.toFixed(2)}%
            </Text>
          </View>
        );
      })}
      <Text style={styles.note}>오늘 하루 기준 변동률 비교</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  rowHighlight: {
    backgroundColor: '#EEF4FF',
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  rowName: { fontSize: 12, color: '#5F6368', width: 70 },
  rowNameHighlight: { fontWeight: '700', color: '#1A73E8' },
  barArea: { flex: 1 },
  barBg: { height: 8, backgroundColor: '#F1F3F4', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  rowPct: { fontSize: 13, fontWeight: '700', width: 58, textAlign: 'right' },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },
  note: { fontSize: 10, color: '#9AA0A6' },
});
