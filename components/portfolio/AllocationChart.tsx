import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { HoldingWithPnL } from '@/types/portfolio';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DOMESTIC_MARKETS = ['KOSPI', 'KOSDAQ'];

// 종목별 색상 팔레트
const PALETTE = [
  '#1A73E8', '#34A853', '#FB8C00', '#EA4335',
  '#9C27B0', '#00ACC1', '#FF7043', '#43A047',
];

type ViewMode = 'region' | 'holdings';

interface Props {
  holdings: HoldingWithPnL[];
}

export function AllocationChart({ holdings }: Props) {
  const [mode, setMode] = useState<ViewMode>('region');

  const total = holdings.reduce((s, h) => s + h.currentValue, 0);
  if (total === 0 || holdings.length === 0) return null;

  // ── 국내/해외 분류 ───────────────────────────────────────
  const domestic = holdings.filter((h) => DOMESTIC_MARKETS.includes(h.market));
  const foreign = holdings.filter((h) => !DOMESTIC_MARKETS.includes(h.market));
  const domesticValue = domestic.reduce((s, h) => s + h.currentValue, 0);
  const foreignValue = foreign.reduce((s, h) => s + h.currentValue, 0);

  const domesticCost = domestic.reduce((s, h) => s + h.costBasis, 0);
  const foreignCost = foreign.reduce((s, h) => s + h.costBasis, 0);
  const domesticPnlPct =
    domesticCost > 0 ? ((domesticValue - domesticCost) / domesticCost) * 100 : 0;
  const foreignPnlPct =
    foreignCost > 0 ? ((foreignValue - foreignCost) / foreignCost) * 100 : 0;

  // ── 차트 데이터 ──────────────────────────────────────────
  const regionPieData = [];
  if (domesticValue > 0) {
    regionPieData.push({
      name: `국내 ${pct(domesticValue, total)}%`,
      value: Math.round(domesticValue),
      color: '#1A73E8',
      legendFontColor: '#5F6368',
      legendFontSize: 12,
    });
  }
  if (foreignValue > 0) {
    regionPieData.push({
      name: `해외 ${pct(foreignValue, total)}%`,
      value: Math.round(foreignValue),
      color: '#34A853',
      legendFontColor: '#5F6368',
      legendFontSize: 12,
    });
  }

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const top6 = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const restValue = rest.reduce((s, h) => s + h.currentValue, 0);

  const holdingPieData = top6.map((h, i) => ({
    name: `${h.ticker} ${pct(h.currentValue, total)}%`,
    value: Math.round(h.currentValue),
    color: PALETTE[i],
    legendFontColor: '#5F6368',
    legendFontSize: 11,
  }));
  if (restValue > 0) {
    holdingPieData.push({
      name: `기타 ${pct(restValue, total)}%`,
      value: Math.round(restValue),
      color: '#BDBDBD',
      legendFontColor: '#5F6368',
      legendFontSize: 11,
    });
  }

  const chartData = mode === 'region' ? regionPieData : holdingPieData;

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(95, 99, 104, ${opacity})`,
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>자산 배분</Text>
        <View style={styles.modeTabs}>
          <Pressable
            style={[styles.modeTab, mode === 'region' && styles.modeTabSelected]}
            onPress={() => setMode('region')}
          >
            <Text style={[styles.modeTabText, mode === 'region' && styles.modeTabTextSelected]}>
              국내/해외
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeTab, mode === 'holdings' && styles.modeTabSelected]}
            onPress={() => setMode('holdings')}
          >
            <Text style={[styles.modeTabText, mode === 'holdings' && styles.modeTabTextSelected]}>
              종목별
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 파이 차트 */}
      <PieChart
        data={chartData}
        width={SCREEN_WIDTH - 32}
        height={170}
        chartConfig={chartConfig}
        accessor="value"
        backgroundColor="transparent"
        paddingLeft="10"
        hasLegend
      />

      {/* 국내/해외 수익률 (region 모드에서만) */}
      {mode === 'region' && (
        <View style={styles.regionStats}>
          {domesticValue > 0 && (
            <View style={styles.regionRow}>
              <View style={[styles.dot, { backgroundColor: '#1A73E8' }]} />
              <Text style={styles.regionLabel}>국내주식</Text>
              <Text style={styles.regionValue}>{formatKrw(domesticValue)}</Text>
              <Text
                style={[
                  styles.regionPnl,
                  domesticPnlPct >= 0 ? styles.up : styles.down,
                ]}
              >
                {domesticPnlPct >= 0 ? '+' : ''}{domesticPnlPct.toFixed(1)}%
              </Text>
            </View>
          )}
          {foreignValue > 0 && (
            <View style={styles.regionRow}>
              <View style={[styles.dot, { backgroundColor: '#34A853' }]} />
              <Text style={styles.regionLabel}>해외주식</Text>
              <Text style={styles.regionValue}>{formatKrw(foreignValue)}</Text>
              <Text
                style={[
                  styles.regionPnl,
                  foreignPnlPct >= 0 ? styles.up : styles.down,
                ]}
              >
                {foreignPnlPct >= 0 ? '+' : ''}{foreignPnlPct.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function pct(value: number, total: number): string {
  return ((value / total) * 100).toFixed(0);
}

function formatKrw(value: number): string {
  return '₩' + Math.round(value).toLocaleString('ko-KR');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  modeTabs: { flexDirection: 'row', gap: 4 },
  modeTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F3F4',
  },
  modeTabSelected: { backgroundColor: '#EEF4FF' },
  modeTabText: { fontSize: 11, fontWeight: '600', color: '#5F6368' },
  modeTabTextSelected: { color: '#1A73E8' },

  regionStats: { gap: 8, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F3F4' },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  regionLabel: { flex: 1, fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  regionValue: { fontSize: 13, color: '#5F6368', fontWeight: '600' },
  regionPnl: { fontSize: 13, fontWeight: '700', minWidth: 54, textAlign: 'right' },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },
});
