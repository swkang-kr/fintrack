import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useHoldingsWithPnL, useUpdateHolding, useDeleteHolding } from '@/hooks/usePortfolio';
import { useFundamentals } from '@/hooks/useFundamentals';

const RECOMMENDATION_KO: Record<string, string> = {
  strongBuy: '강력 매수',
  buy: '매수',
  hold: '보유',
  sell: '매도',
  strongSell: '강력 매도',
};

function formatMarketCap(v: number | null | undefined): string {
  if (v == null) return '-'; // null + undefined 모두 처리
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  return v.toLocaleString();
}

export default function HoldingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { holdings } = useHoldingsWithPnL();
  const holding = holdings.find((h) => h.id === id);

  const updateHolding = useUpdateHolding();
  const deleteHolding = useDeleteHolding();

  const { data: fundamentals, isLoading: isFundamentalsLoading } = useFundamentals(
    holding?.yahooTicker ?? null
  );

  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (holding) {
      setQuantity(String(holding.quantity));
      setAvgPrice(String(holding.avg_price));
    }
  }, [holding]);

  if (!holding) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="종목 상세" />
        <Text style={styles.notFound}>종목을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const isUp = (holding.pnl ?? 0) >= 0;
  const currency = holding.currency === 'KRW' ? '₩' : '$';

  async function handleSave() {
    if (!holding) return;
    const qty = parseFloat(quantity);
    const price = parseFloat(avgPrice);

    if (isNaN(qty) || qty <= 0) {
      Alert.alert('오류', '수량을 올바르게 입력하세요.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('오류', '평균 매수가를 올바르게 입력하세요.');
      return;
    }

    setSaving(true);
    try {
      await updateHolding.mutateAsync({ id: holding.id, updates: { quantity: qty, avg_price: price } });
      router.back();
    } catch (err: unknown) {
      Alert.alert('오류', err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!holding) return;
    Alert.alert(
      '종목 삭제',
      `${holding.name} 종목을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHolding.mutateAsync(holding.id);
              router.back();
            } catch {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }

  // 목표주가 대비 상승여력
  const upside =
    fundamentals?.targetMeanPrice && holding.currentPrice > 0
      ? ((fundamentals.targetMeanPrice - holding.currentPrice) / holding.currentPrice) * 100
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={holding.name} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* 종목 헤더 */}
          <View style={styles.stockHeader}>
            <Text style={styles.stockName}>{holding.name}</Text>
            <Text style={styles.stockMeta}>
              {holding.ticker} · {holding.market}
            </Text>

            {/* 현재가 / 수익률 */}
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>현재가</Text>
                <Text style={styles.currentPrice}>
                  {currency}{(holding.currentPrice ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.pnlBox}>
                <Text style={[styles.pnlPct, isUp ? styles.up : styles.down]}>
                  {isUp ? '▲ +' : '▼ '}{(holding.pnlPercent ?? 0).toFixed(2)}%
                </Text>
                <Text style={[styles.pnlAbs, isUp ? styles.up : styles.down]}>
                  {isUp ? '+' : ''}₩{Math.round(holding.pnl ?? 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* 펀더멘털 */}
          <View style={styles.fundamentalsCard}>
              <Text style={styles.cardTitle}>기업 펀더멘털</Text>
              {isFundamentalsLoading ? (
                <Text style={styles.loadingText}>불러오는 중...</Text>
              ) : fundamentals ? (
                <>
                  <View style={styles.fundamentalsGrid}>
                    <FundRow label="PER (TTM)" value={fundamentals.trailingPE?.toFixed(1) ?? '-'} />
                    <FundRow label="PER (Forward)" value={fundamentals.forwardPE?.toFixed(1) ?? '-'} />
                    <FundRow label="EPS" value={fundamentals.eps != null ? `${currency}${fundamentals.eps.toFixed(2)}` : '-'} />
                    <FundRow label="베타" value={fundamentals.beta?.toFixed(2) ?? '-'} />
                    <FundRow
                      label="52주 최고"
                      value={fundamentals.fiftyTwoWeekHigh != null ? `${currency}${fundamentals.fiftyTwoWeekHigh.toLocaleString()}` : '-'}
                    />
                    <FundRow
                      label="52주 최저"
                      value={fundamentals.fiftyTwoWeekLow != null ? `${currency}${fundamentals.fiftyTwoWeekLow.toLocaleString()}` : '-'}
                    />
                    <FundRow label="시가총액" value={formatMarketCap(fundamentals.marketCap)} />
                    <FundRow
                      label="배당수익률"
                      value={fundamentals.dividendYield != null ? `${fundamentals.dividendYield.toFixed(2)}%` : '-'}
                    />
                  </View>

                  {/* 애널리스트 목표주가 */}
                  {fundamentals.targetMeanPrice && (
                    <View style={styles.targetSection}>
                      <View style={styles.targetRow}>
                        <Text style={styles.targetLabel}>
                          목표주가 ({fundamentals.numberOfAnalystOpinions ?? 0}명)
                        </Text>
                        {fundamentals.recommendationKey && (
                          <View style={[
                            styles.recBadge,
                            fundamentals.recommendationKey === 'buy' || fundamentals.recommendationKey === 'strongBuy'
                              ? styles.recUp : styles.recHold,
                          ]}>
                            <Text style={styles.recBadgeText}>
                              {RECOMMENDATION_KO[fundamentals.recommendationKey] ?? fundamentals.recommendationKey}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.targetMean}>
                        {currency}{fundamentals.targetMeanPrice.toLocaleString()}
                        {upside !== null && (
                          <Text style={[styles.targetUpside, upside >= 0 ? styles.up : styles.down]}>
                            {' '}{upside >= 0 ? '  ▲' : '  ▼'} {Math.abs(upside).toFixed(1)}%
                          </Text>
                        )}
                      </Text>
                      <Text style={styles.targetRange}>
                        {currency}{fundamentals.targetLowPrice?.toLocaleString() ?? '-'} ~{' '}
                        {currency}{fundamentals.targetHighPrice?.toLocaleString() ?? '-'}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.loadingText}>펀더멘털 데이터 없음</Text>
              )}
            </View>

          {/* 수정 폼 */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>보유 정보 수정</Text>

            <Text style={styles.label}>보유 수량</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#C5C5C5"
            />

            <Text style={styles.label}>
              평균 매수가 ({holding.currency === 'KRW' ? '원' : 'USD'})
            </Text>
            <TextInput
              style={styles.input}
              value={avgPrice}
              onChangeText={setAvgPrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#C5C5C5"
            />
          </View>
        </ScrollView>

        {/* 하단 버튼 */}
        <View style={styles.actions}>
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>삭제</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '수정 완료'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FundRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fundRow}>
      <Text style={styles.fundLabel}>{label}</Text>
      <Text style={styles.fundValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  notFound: { textAlign: 'center', padding: 40, color: '#888', fontSize: 15 },
  content: { padding: 20, gap: 16 },
  stockHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stockName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  stockMeta: { fontSize: 13, color: '#9AA0A6', marginTop: 4 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  priceLabel: { fontSize: 12, color: '#9AA0A6' },
  currentPrice: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  pnlBox: { alignItems: 'flex-end' },
  pnlPct: { fontSize: 16, fontWeight: '700' },
  pnlAbs: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },

  // 펀더멘털 카드
  fundamentalsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  loadingText: { fontSize: 13, color: '#9AA0A6' },
  fundamentalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  fundRow: {
    width: '50%',
    paddingVertical: 8,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
    gap: 2,
  },
  fundLabel: { fontSize: 11, color: '#9AA0A6' },
  fundValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  targetSection: {
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetLabel: { fontSize: 12, color: '#5F6368', fontWeight: '600' },
  targetMean: { fontSize: 20, fontWeight: '800', color: '#1A73E8' },
  targetUpside: { fontSize: 14, fontWeight: '700' },
  targetRange: { fontSize: 11, color: '#9AA0A6' },
  recBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recUp: { backgroundColor: '#FEECEC' },
  recHold: { backgroundColor: '#FFF8E1' },
  recBadgeText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },

  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#5F6368', marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#F8F9FA',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
  deleteBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E53935',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#E53935', fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 2,
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
