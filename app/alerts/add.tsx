import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useAddAlert } from '@/hooks/useAlerts';
import { useStockSearch, useStockQuote } from '@/hooks/useStock';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { AlertCondition, AlertType, EXCHANGE_TARGETS } from '@/types/alerts';
import { StockSearchResult } from '@/services/stockApi';

type Step = 'type' | 'target' | 'condition' | 'threshold';

export default function AddAlertScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addAlert = useAddAlert();

  const [step, setStep] = useState<Step>('type');
  const [alertType, setAlertType] = useState<AlertType>('exchange_rate');
  const [target, setTarget] = useState('');
  const [stockQuery, setStockQuery] = useState('');
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [threshold, setThreshold] = useState('');

  const { data: searchResults = [], isFetching: isSearching } = useStockSearch(stockQuery);
  const { data: currentQuote } = useStockQuote(alertType === 'stock_price' && target ? target : null);
  const { data: ratesData } = useExchangeRates();

  // ── 저장 ────────────────────────────────────────────────
  async function handleSave() {
    const parsed = parseFloat(threshold.replace(/,/g, ''));
    if (!target || isNaN(parsed) || parsed <= 0) return;

    addAlert.mutate(
      { type: alertType, target, condition, threshold: parsed },
      { onSuccess: () => router.back() }
    );
  }

  // ── 단계별 렌더 ─────────────────────────────────────────
  function renderTypeStep() {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>알림 유형 선택</Text>
        <View style={styles.optionGroup}>
          <Pressable
            style={[styles.optionCard, alertType === 'exchange_rate' && styles.optionCardSelected]}
            onPress={() => {
              setAlertType('exchange_rate');
              setTarget('');
              setStockQuery('');
            }}
          >
            <Text style={styles.optionIcon}>💱</Text>
            <Text style={[styles.optionLabel, alertType === 'exchange_rate' && styles.optionLabelSelected]}>
              환율
            </Text>
            <Text style={styles.optionDesc}>USD/KRW, EUR/KRW 등</Text>
          </Pressable>

          <Pressable
            style={[styles.optionCard, alertType === 'stock_price' && styles.optionCardSelected]}
            onPress={() => {
              setAlertType('stock_price');
              setTarget('');
              setStockQuery('');
            }}
          >
            <Text style={styles.optionIcon}>📈</Text>
            <Text style={[styles.optionLabel, alertType === 'stock_price' && styles.optionLabelSelected]}>
              주가
            </Text>
            <Text style={styles.optionDesc}>국내·해외 주식</Text>
          </Pressable>
        </View>

        <Pressable style={styles.nextBtn} onPress={() => setStep('target')}>
          <Text style={styles.nextBtnText}>다음</Text>
        </Pressable>
      </View>
    );
  }

  function renderTargetStep() {
    if (alertType === 'exchange_rate') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>통화쌍 선택</Text>
          <View style={styles.currencyList}>
            {EXCHANGE_TARGETS.map((item) => (
              <Pressable
                key={item.value}
                style={[styles.currencyRow, target === item.value && styles.currencyRowSelected]}
                onPress={() => setTarget(item.value)}
              >
                <Text style={[styles.currencyLabel, target === item.value && styles.currencyLabelSelected]}>
                  {item.label}
                </Text>
                {target === item.value && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
            ))}
          </View>

          <View style={styles.rowBtns}>
            <Pressable style={styles.backBtn} onPress={() => setStep('type')}>
              <Text style={styles.backBtnText}>이전</Text>
            </Pressable>
            <Pressable
              style={[styles.nextBtn, !target && styles.nextBtnDisabled]}
              disabled={!target}
              onPress={() => setStep('condition')}
            >
              <Text style={styles.nextBtnText}>다음</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // 주식 검색
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>종목 검색</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="종목명 또는 티커 입력 (예: 삼성전자, AAPL)"
          value={stockQuery}
          onChangeText={setStockQuery}
          autoFocus
          returnKeyType="search"
        />

        {isSearching && <Text style={styles.searchingText}>검색 중...</Text>}

        {searchResults.length > 0 && (
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
            {searchResults.map((item: StockSearchResult) => (
              <Pressable
                key={item.yahooTicker}
                style={[
                  styles.searchRow,
                  target === item.yahooTicker && styles.searchRowSelected,
                ]}
                onPress={() => {
                  setTarget(item.yahooTicker);
                  setStockQuery(item.name);
                }}
              >
                <View>
                  <Text style={styles.searchRowTicker}>{item.ticker}</Text>
                  <Text style={styles.searchRowName}>{item.name}</Text>
                </View>
                <Text style={styles.searchRowMarket}>{item.market}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {stockQuery.length > 0 && !isSearching && searchResults.length === 0 && (
          <Text style={styles.noResults}>검색 결과가 없습니다.</Text>
        )}

        <View style={styles.rowBtns}>
          <Pressable style={styles.backBtn} onPress={() => setStep('type')}>
            <Text style={styles.backBtnText}>이전</Text>
          </Pressable>
          <Pressable
            style={[styles.nextBtn, !target && styles.nextBtnDisabled]}
            disabled={!target}
            onPress={() => setStep('condition')}
          >
            <Text style={styles.nextBtnText}>다음</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderConditionStep() {
    const targetLabel = target;
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>조건 선택</Text>
        <Text style={styles.stepSubtitle}>{targetLabel} 가격이...</Text>

        <View style={styles.optionGroup}>
          <Pressable
            style={[styles.optionCard, condition === 'above' && styles.optionCardSelected]}
            onPress={() => setCondition('above')}
          >
            <Text style={styles.optionIcon}>📈</Text>
            <Text style={[styles.optionLabel, condition === 'above' && styles.optionLabelSelected]}>
              이상
            </Text>
            <Text style={styles.optionDesc}>목표가 이상 시 알림</Text>
          </Pressable>

          <Pressable
            style={[styles.optionCard, condition === 'below' && styles.optionCardSelected]}
            onPress={() => setCondition('below')}
          >
            <Text style={styles.optionIcon}>📉</Text>
            <Text style={[styles.optionLabel, condition === 'below' && styles.optionLabelSelected]}>
              이하
            </Text>
            <Text style={styles.optionDesc}>목표가 이하 시 알림</Text>
          </Pressable>
        </View>

        <View style={styles.rowBtns}>
          <Pressable style={styles.backBtn} onPress={() => setStep('target')}>
            <Text style={styles.backBtnText}>이전</Text>
          </Pressable>
          <Pressable style={styles.nextBtn} onPress={() => setStep('threshold')}>
            <Text style={styles.nextBtnText}>다음</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderThresholdStep() {
    const isKoreanStock = target.endsWith('.KS') || target.endsWith('.KQ');
    const isJpy = target.startsWith('JPY');
    const currencySymbol =
      alertType === 'exchange_rate' ? '₩'
      : isKoreanStock ? '₩'
      : '$';
    const placeholder =
      isJpy ? '예: 8.9500'
      : isKoreanStock ? '예: 72000'
      : alertType === 'exchange_rate' ? '예: 1350.00'
      : '예: 185.00';

    // 현재가 기준값 계산
    let currentPriceRef: string | null = null;
    if (alertType === 'stock_price' && currentQuote?.price) {
      currentPriceRef = isKoreanStock
        ? `₩${Math.round(currentQuote.price).toLocaleString('ko-KR')}`
        : `$${currentQuote.price.toFixed(2)}`;
    } else if (alertType === 'exchange_rate' && ratesData?.rates) {
      const currency = target.split('/')[0] as keyof typeof ratesData.rates;
      const rate = ratesData.rates[currency];
      if (rate) {
        currentPriceRef = isJpy
          ? `₩${rate.toFixed(4)}`
          : `₩${Math.round(rate).toLocaleString('ko-KR')}`;
      }
    }

    const parsed = parseFloat(threshold.replace(/,/g, ''));
    const isValid = !isNaN(parsed) && parsed > 0;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>목표가 입력</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.stepSubtitle}>
            {target.replace(/\.(KS|KQ)$/, '')} {condition === 'above' ? '이상' : '이하'} 시 알림
          </Text>
          {currentPriceRef && (
            <View style={styles.currentPriceBadge}>
              <Text style={styles.currentPriceLabel}>현재가</Text>
              <Text style={styles.currentPriceValue}>{currentPriceRef}</Text>
            </View>
          )}
        </View>

        <View style={styles.thresholdInputRow}>
          <Text style={styles.currencySymbol}>{currencySymbol}</Text>
          <TextInput
            style={styles.thresholdInput}
            placeholder={placeholder}
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        <View style={styles.rowBtns}>
          <Pressable style={styles.backBtn} onPress={() => setStep('condition')}>
            <Text style={styles.backBtnText}>이전</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!isValid || addAlert.isPending) && styles.nextBtnDisabled]}
            disabled={!isValid || addAlert.isPending}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>
              {addAlert.isPending ? '저장 중...' : '알림 저장'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── 진행 단계 표시기 ────────────────────────────────────
  const steps: Step[] = ['type', 'target', 'condition', 'threshold'];
  const stepLabels = ['유형', '대상', '조건', '목표가'];
  const currentIdx = steps.indexOf(step);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 진행 표시기 + 닫기 버튼 */}
        <View style={[styles.progressBar, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
            <FontAwesome name="times" size={17} color="#1A1A1A" />
          </Pressable>
          {steps.map((s, i) => (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, i <= currentIdx && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, i <= currentIdx && styles.progressDotTextActive]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.progressLabel, i === currentIdx && styles.progressLabelActive]}>
                {stepLabels[i]}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'type' && renderTypeStep()}
          {step === 'target' && renderTargetStep()}
          {step === 'condition' && renderConditionStep()}
          {step === 'threshold' && renderThresholdStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { flexGrow: 1, padding: 20 },

  // 진행 표시기
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
    gap: 0,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: '#1A73E8',
  },
  progressDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9AA0A6',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: 10,
    color: '#9AA0A6',
    fontWeight: '500',
  },
  progressLabelActive: {
    color: '#1A73E8',
    fontWeight: '700',
  },

  // 단계 컨테이너
  stepContainer: { gap: 20 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -12 },
  stepSubtitle: { fontSize: 14, color: '#5F6368', flex: 1 },
  currentPriceBadge: {
    backgroundColor: '#EEF4FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  currentPriceLabel: { fontSize: 10, color: '#5F6368', fontWeight: '600' },
  currentPriceValue: { fontSize: 14, color: '#1A73E8', fontWeight: '800', marginTop: 1 },

  // 옵션 카드 (유형/조건)
  optionGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: '#1A73E8',
    backgroundColor: '#EEF4FF',
  },
  optionIcon: { fontSize: 28 },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  optionLabelSelected: { color: '#1A73E8' },
  optionDesc: { fontSize: 11, color: '#9AA0A6', textAlign: 'center' },

  // 통화 목록
  currencyList: { gap: 8 },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  currencyRowSelected: {
    borderColor: '#1A73E8',
    backgroundColor: '#EEF4FF',
  },
  currencyLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  currencyLabelSelected: { color: '#1A73E8' },
  checkMark: { fontSize: 16, color: '#1A73E8', fontWeight: '700' },

  // 주식 검색
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  searchingText: { fontSize: 13, color: '#9AA0A6', textAlign: 'center' },
  noResults: { fontSize: 13, color: '#9AA0A6', textAlign: 'center' },
  searchResults: { maxHeight: 260 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  searchRowSelected: {
    borderColor: '#1A73E8',
    backgroundColor: '#EEF4FF',
  },
  searchRowTicker: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  searchRowName: { fontSize: 12, color: '#5F6368', marginTop: 2 },
  searchRowMarket: { fontSize: 11, color: '#9AA0A6', fontWeight: '500' },

  // 목표가 입력
  thresholdInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5F6368',
    marginRight: 6,
  },
  thresholdInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingVertical: 14,
  },

  // 버튼
  rowBtns: { flexDirection: 'row', gap: 10 },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#5F6368' },
  nextBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: '#BDD7FB' },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#34A853',
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
