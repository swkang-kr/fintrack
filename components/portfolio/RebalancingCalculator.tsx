import React, { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { HoldingWithPnL } from '@/types/portfolio';

interface Props {
  holdings: HoldingWithPnL[];
  totalValue: number;
  usdKrw: number;
}

interface RebalResult {
  ticker: string;
  name: string;
  currency: string;
  market: string;
  currentWeight: number;
  targetWeight: number;
  currentValue: number;
  targetValue: number;
  diffValue: number;
  sharesChange: number;
  currentPrice: number;
  action: 'buy' | 'sell' | 'hold';
}

const DOMESTIC_MARKETS = ['KOSPI', 'KOSDAQ'];

function isKorean(market: string): boolean {
  return DOMESTIC_MARKETS.includes(market);
}

export function RebalancingCalculator({ holdings, totalValue, usdKrw }: Props) {
  // 목표 비중 상태 (초기값: 현재 비중으로 균등 분배 또는 현재 비중)
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    holdings.forEach((h) => {
      const w = totalValue > 0 ? ((h.currentValue / totalValue) * 100).toFixed(1) : '0';
      obj[h.id] = w;
    });
    return obj;
  });

  const [results, setResults] = useState<RebalResult[] | null>(null);

  // 목표 합계
  const targetSum = holdings.reduce((s, h) => {
    const v = parseFloat(targets[h.id] ?? '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);

  const isValid = Math.abs(targetSum - 100) < 0.5;

  function handleEqualDistribute() {
    const equal = (100 / holdings.length).toFixed(1);
    const obj: Record<string, string> = {};
    holdings.forEach((h) => { obj[h.id] = equal; });
    setTargets(obj);
    setResults(null);
  }

  function handleCalculate() {
    if (!isValid) return;

    const res: RebalResult[] = holdings.map((h) => {
      const targetWeight = parseFloat(targets[h.id] ?? '0') || 0;
      const targetValue = (targetWeight / 100) * totalValue;
      const diffValue = targetValue - h.currentValue;

      // 주가 (KRW 환산)
      const priceKrw = h.currency === 'USD'
        ? (h.quote?.price ?? h.avg_price) * usdKrw
        : (h.quote?.price ?? h.avg_price);

      let sharesChange = priceKrw > 0 ? diffValue / priceKrw : 0;

      // 국내 주식: 정수로 반올림
      if (isKorean(h.market)) {
        sharesChange = Math.round(sharesChange);
      } else {
        sharesChange = parseFloat(sharesChange.toFixed(4));
      }

      const action = sharesChange > 0.0001 ? 'buy' : sharesChange < -0.0001 ? 'sell' : 'hold';

      return {
        ticker: h.ticker,
        name: h.name,
        currency: h.currency,
        market: h.market,
        currentWeight: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
        targetWeight,
        currentValue: h.currentValue,
        targetValue,
        diffValue,
        sharesChange,
        currentPrice: h.quote?.price ?? h.avg_price,
        action,
      };
    });

    setResults(res);
    Keyboard.dismiss();
  }

  const symFor = (currency: string) => currency === 'USD' ? '$' : '₩';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* 안내 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 각 종목의 목표 비중을 입력하세요. 합계가 100%가 되어야 계산할 수 있습니다.
          </Text>
          <Text style={styles.infoText}>
            📌 국내 주식(KOSPI/KOSDAQ)은 소수점 거래 불가 — 1주 단위로 자동 반올림됩니다.
          </Text>
        </View>

        {/* 균등 배분 버튼 */}
        <Pressable style={styles.equalBtn} onPress={handleEqualDistribute}>
          <Text style={styles.equalBtnText}>⚖️ 균등 배분 ({(100 / holdings.length).toFixed(1)}%씩)</Text>
        </Pressable>

        {/* 목표 비중 입력 */}
        <View style={styles.inputSection}>
          {holdings.map((h) => {
            const current = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
            const target = parseFloat(targets[h.id] ?? '0') || 0;
            const diff = target - current;

            return (
              <View key={h.id} style={styles.inputRow}>
                <View style={styles.inputLeft}>
                  <Text style={styles.holdingName} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.holdingMeta}>{h.ticker} · 현재 {current.toFixed(1)}%</Text>
                </View>
                <View style={styles.inputRight}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={targets[h.id]}
                      onChangeText={(v) => {
                        setTargets((prev) => ({ ...prev, [h.id]: v }));
                        setResults(null);
                      }}
                      keyboardType="decimal-pad"
                      maxLength={5}
                      selectTextOnFocus
                    />
                    <Text style={styles.inputUnit}>%</Text>
                  </View>
                  {Math.abs(diff) > 0.05 && (
                    <Text style={[styles.diffLabel, diff > 0 ? styles.up : styles.down]}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* 합계 표시 */}
        <View style={[styles.sumRow, !isValid && styles.sumRowError]}>
          <Text style={[styles.sumLabel, !isValid && styles.sumLabelError]}>
            목표 비중 합계: {targetSum.toFixed(1)}% {isValid ? '✓' : '(100%가 되어야 합니다)'}
          </Text>
        </View>

        {/* 계산 버튼 */}
        <Pressable
          style={[styles.calcBtn, !isValid && styles.calcBtnDisabled]}
          disabled={!isValid}
          onPress={handleCalculate}
        >
          <Text style={styles.calcBtnText}>⚖️ 리밸런싱 계산</Text>
        </Pressable>

        {/* 결과 */}
        {results && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>📋 리밸런싱 방법</Text>

            {results.map((r) => {
              if (r.action === 'hold') return null;
              const sym = symFor(r.currency);
              const priceStr = r.currency === 'USD'
                ? `${sym}${r.currentPrice.toFixed(2)}`
                : `${sym}${Math.round(r.currentPrice).toLocaleString('ko-KR')}`;
              const sharesStr = isKorean(r.market)
                ? `${Math.abs(r.sharesChange)}주`
                : `${Math.abs(r.sharesChange).toFixed(4)}주`;
              const amtStr = `₩${Math.abs(Math.round(r.diffValue)).toLocaleString('ko-KR')}`;

              return (
                <View key={r.ticker} style={[
                  styles.resultCard,
                  r.action === 'buy' ? styles.resultBuy : styles.resultSell,
                ]}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultName}>{r.name}</Text>
                    <View style={[
                      styles.actionBadge,
                      r.action === 'buy' ? styles.buyBadge : styles.sellBadge,
                    ]}>
                      <Text style={styles.actionBadgeText}>
                        {r.action === 'buy' ? '매수' : '매도'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.resultShares}>
                    {sharesStr} ({amtStr})
                  </Text>
                  <Text style={styles.resultMeta}>
                    현재가 {priceStr} · {r.currentWeight.toFixed(1)}% → {r.targetWeight.toFixed(1)}%
                  </Text>
                </View>
              );
            })}

            {results.every((r) => r.action === 'hold') && (
              <View style={styles.holdCard}>
                <Text style={styles.holdText}>✅ 현재 비중이 목표와 거의 동일합니다!</Text>
              </View>
            )}

            <Text style={styles.disclaimer}>
              * 수익률 계산은 현재 시장가 기준이며 실제 거래 가격과 차이가 있을 수 있습니다.
            </Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },

  infoCard: {
    backgroundColor: '#EEF4FF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  infoText: { fontSize: 12, color: '#3C4043', lineHeight: 18 },

  equalBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#F1F3F4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  equalBtnText: { fontSize: 13, fontWeight: '600', color: '#5F6368' },

  inputSection: {
    marginTop: 10,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  inputLeft: { flex: 1, gap: 2 },
  holdingName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  holdingMeta: { fontSize: 11, color: '#9AA0A6' },
  inputRight: { alignItems: 'flex-end', gap: 3 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    width: 70,
    textAlign: 'right',
  },
  inputUnit: { fontSize: 14, fontWeight: '600', color: '#5F6368' },
  diffLabel: { fontSize: 11, fontWeight: '600' },

  sumRow: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F0FAF4',
  },
  sumRowError: { backgroundColor: '#FFF8F8' },
  sumLabel: { fontSize: 12, fontWeight: '700', color: '#1B5E20', textAlign: 'center' },
  sumLabelError: { color: '#C62828' },

  calcBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  calcBtnDisabled: { backgroundColor: '#BDD7FB' },
  calcBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  resultSection: { marginTop: 16, marginHorizontal: 16, gap: 10 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  resultCard: {
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  resultBuy: { backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#FBCCC8' },
  resultSell: { backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#C5D9F9' },

  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  buyBadge: { backgroundColor: '#E53935' },
  sellBadge: { backgroundColor: '#1A73E8' },
  actionBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  resultShares: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  resultMeta: { fontSize: 11, color: '#5F6368' },

  holdCard: {
    backgroundColor: '#F0FAF4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  holdText: { fontSize: 14, fontWeight: '700', color: '#1B5E20' },

  disclaimer: {
    fontSize: 11,
    color: '#9AA0A6',
    textAlign: 'center',
    lineHeight: 16,
    paddingTop: 4,
  },

  up: { color: '#E53935' },
  down: { color: '#1565C0' },
});
