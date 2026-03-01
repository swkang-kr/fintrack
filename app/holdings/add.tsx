import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { usePortfolio, useAddHolding } from '@/hooks/usePortfolio';
import { useStockSearch } from '@/hooks/useStock';
import { StockSearchResult } from '@/services/stockApi';

type Step = 'search' | 'form';

export default function AddHoldingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefillTicker?: string;
    prefillName?: string;
    prefillMarket?: string;
    prefillCurrency?: string;
  }>();
  const { data: portfolio } = usePortfolio();
  const addHolding = useAddHolding();

  // 관심종목에서 진입 시 pre-fill
  const prefilled: StockSearchResult | null =
    params.prefillTicker && params.prefillName && params.prefillMarket && params.prefillCurrency
      ? {
          yahooTicker: params.prefillTicker,
          ticker: params.prefillTicker,
          name: params.prefillName,
          market: params.prefillMarket,
          currency: params.prefillCurrency,
        }
      : null;

  // ── Step 1: 검색 ───────────────────────────────────────
  const [step, setStep] = useState<Step>(prefilled ? 'form' : 'search');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StockSearchResult | null>(prefilled);
  const { data: searchResults = [], isLoading: searching } = useStockSearch(query);

  // ── Step 2: 수량·단가 입력 ─────────────────────────────
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [dividendRate, setDividendRate] = useState('');
  const [saving, setSaving] = useState(false);

  function handleSelect(result: StockSearchResult) {
    setSelected(result);
    setStep('form');
  }

  async function handleSave() {
    if (!portfolio || !selected) return;
    const qty = parseFloat(quantity);
    const price = parseFloat(avgPrice);

    if (isNaN(qty) || qty <= 0) {
      Alert.alert('오류', '수량을 올바르게 입력해주세요.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('오류', '평균 매수가를 올바르게 입력해주세요.');
      return;
    }

    const divRate = parseFloat(dividendRate);

    setSaving(true);
    try {
      await addHolding.mutateAsync({
        portfolio_id: portfolio.id,
        ticker: selected.ticker,
        name: selected.name,
        market: selected.market,
        quantity: qty,
        avg_price: price,
        currency: selected.currency,
        dividend_rate: !isNaN(divRate) && divRate > 0 ? divRate : undefined,
      });
      router.back();
    } catch (err: unknown) {
      Alert.alert('오류', err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  // ── Step 1 UI: 종목 검색 ──────────────────────────────
  if (step === 'search') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="종목 추가" modal />
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="종목명 또는 티커 (예: 삼성전자, AAPL)"
            placeholderTextColor="#C5C5C5"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        {/* 사진으로 일괄 등록 */}
        <Pressable style={styles.scanBanner} onPress={() => router.push('/holdings/scan')}>
          <Text style={styles.scanBannerIcon}>📷</Text>
          <View style={styles.scanBannerText}>
            <Text style={styles.scanBannerTitle}>사진으로 일괄 등록</Text>
            <Text style={styles.scanBannerDesc}>증권사 앱 스크린샷으로 여러 종목 한 번에 추가</Text>
          </View>
          <Text style={styles.scanBannerArrow}>›</Text>
        </Pressable>

        {searching && <Text style={styles.hint}>검색 중...</Text>}
        {!searching && query.length > 0 && searchResults.length === 0 && (
          <Text style={styles.hint}>검색 결과가 없습니다.</Text>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.yahooTicker}
          renderItem={({ item }) => (
            <Pressable style={styles.resultItem} onPress={() => handleSelect(item)}>
              <View style={styles.resultLeft}>
                <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.resultMeta}>{item.ticker} · {item.market}</Text>
              </View>
              <Text style={styles.resultCurrency}>{item.currency}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    );
  }

  // ── Step 2 UI: 수량·단가 입력 ─────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="종목 추가" modal onBack={() => setStep('search')} />
      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 선택된 종목 정보 */}
        <Pressable style={styles.selectedStock} onPress={() => setStep('search')}>
          <View>
            <Text style={styles.selectedName}>{selected?.name}</Text>
            <Text style={styles.selectedMeta}>
              {selected?.ticker} · {selected?.market} · {selected?.currency}
            </Text>
          </View>
          <Text style={styles.changeLink}>변경</Text>
        </Pressable>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <Text style={styles.label}>보유 수량</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#C5C5C5"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>
            평균 매수가 ({selected?.currency === 'KRW' ? '원' : 'USD'})
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#C5C5C5"
            value={avgPrice}
            onChangeText={setAvgPrice}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>연간 배당수익률 (%, 선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 2.5"
            placeholderTextColor="#C5C5C5"
            value={dividendRate}
            onChangeText={setDividendRate}
            keyboardType="decimal-pad"
          />

          {quantity && avgPrice && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>예상 취득원가</Text>
              <Text style={styles.previewValue}>
                {selected?.currency === 'KRW' ? '₩' : '$'}
                {(parseFloat(quantity || '0') * parseFloat(avgPrice || '0')).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '종목 추가'}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  // Step 1: search
  searchBox: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#E8EAED',
  },
  hint: { textAlign: 'center', color: '#9AA0A6', padding: 20, fontSize: 14 },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#F0FAF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C8EDD5',
  },
  scanBannerIcon: { fontSize: 28 },
  scanBannerText: { flex: 1 },
  scanBannerTitle: { fontSize: 14, fontWeight: '700', color: '#1B5E20' },
  scanBannerDesc: { fontSize: 12, color: '#5F6368', marginTop: 2 },
  scanBannerArrow: { fontSize: 20, color: '#34A853', fontWeight: '700' },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  resultLeft: { flex: 1, marginRight: 12 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  resultMeta: { fontSize: 12, color: '#9AA0A6', marginTop: 2 },
  resultCurrency: { fontSize: 13, color: '#5F6368', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F1F3F4', marginHorizontal: 20 },
  // Step 2: form
  formContainer: { flex: 1, padding: 20 },
  selectedStock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#1A73E8',
  },
  selectedName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  selectedMeta: { fontSize: 12, color: '#5F6368', marginTop: 4 },
  changeLink: { fontSize: 13, color: '#1A73E8', fontWeight: '600' },
  form: { gap: 8 },
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
  preview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  previewLabel: { fontSize: 13, color: '#5F6368' },
  previewValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  saveBtn: {
    marginTop: 'auto',
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
