import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { CurrencyCode } from '@/services/exchangeApi';

const CURRENCIES: { code: CurrencyCode; flag: string; name: string }[] = [
  { code: 'USD', flag: '🇺🇸', name: '달러' },
  { code: 'EUR', flag: '🇪🇺', name: '유로' },
  { code: 'JPY', flag: '🇯🇵', name: '엔화' },
  { code: 'CNY', flag: '🇨🇳', name: '위안' },
];

type Direction = 'foreign_to_krw' | 'krw_to_foreign';

export function CurrencyCalculator() {
  const { data: ratesData } = useExchangeRates();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [direction, setDirection] = useState<Direction>('foreign_to_krw');

  const rate = ratesData?.rates[currency] ?? 0;
  const num = parseFloat(amount.replace(/,/g, '')) || 0;

  const result =
    rate > 0
      ? direction === 'foreign_to_krw'
        ? num * rate
        : num / rate
      : 0;

  const fromLabel = direction === 'foreign_to_krw' ? currency : 'KRW';
  const toLabel = direction === 'foreign_to_krw' ? 'KRW' : currency;
  const fromSymbol = direction === 'foreign_to_krw' ? currencySymbol(currency) : '₩';
  const toSymbol = direction === 'foreign_to_krw' ? '₩' : currencySymbol(currency);

  function formatResult(val: number): string {
    if (val === 0) return '0';
    if (toLabel === 'KRW') return Math.round(val).toLocaleString('ko-KR');
    if (toLabel === 'JPY') return val.toFixed(0);
    return val.toFixed(2);
  }

  function formatRateHint(): string {
    if (!rate) return '';
    if (currency === 'JPY') return `1 ${currency} = ₩${rate.toFixed(4)}`;
    return `1 ${currency} = ₩${rate.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>💱 환율 계산기</Text>
        {rate > 0 && <Text style={styles.rateHint}>{formatRateHint()}</Text>}
      </View>

      {/* 입력 + 결과 */}
      <View style={styles.calcRow}>
        {/* 입력 */}
        <View style={styles.inputBox}>
          <Text style={styles.currencySymbol}>{fromSymbol}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#C5C5C5"
          />
          <Text style={styles.currencyCode}>{fromLabel}</Text>
        </View>

        {/* 방향 전환 */}
        <Pressable
          style={styles.swapBtn}
          onPress={() =>
            setDirection((d) =>
              d === 'foreign_to_krw' ? 'krw_to_foreign' : 'foreign_to_krw'
            )
          }
        >
          <Text style={styles.swapIcon}>⇌</Text>
        </Pressable>

        {/* 결과 */}
        <View style={[styles.inputBox, styles.resultBox]}>
          <Text style={styles.currencySymbol}>{toSymbol}</Text>
          <Text style={styles.resultText} numberOfLines={1}>
            {num > 0 ? formatResult(result) : '-'}
          </Text>
          <Text style={styles.currencyCode}>{toLabel}</Text>
        </View>
      </View>

      {/* 통화 선택 탭 */}
      <View style={styles.tabs}>
        {CURRENCIES.map((c) => (
          <Pressable
            key={c.code}
            style={[styles.tab, currency === c.code && styles.tabSelected]}
            onPress={() => setCurrency(c.code)}
          >
            <Text style={styles.tabFlag}>{c.flag}</Text>
            <Text
              style={[styles.tabLabel, currency === c.code && styles.tabLabelSelected]}
            >
              {c.code}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function currencySymbol(code: CurrencyCode): string {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'CNY': return '¥';
    default: return '';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  rateHint: { fontSize: 11, color: '#9AA0A6' },

  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8EAED',
    gap: 4,
  },
  resultBox: {
    backgroundColor: '#EEF4FF',
    borderColor: '#BDD7FB',
  },
  currencySymbol: { fontSize: 14, color: '#5F6368', fontWeight: '600' },
  amountInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    padding: 0,
  },
  resultText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#1A73E8',
  },
  currencyCode: { fontSize: 10, color: '#9AA0A6', fontWeight: '600' },

  swapBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: { fontSize: 18, color: '#1A73E8' },

  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  tabSelected: {
    backgroundColor: '#EEF4FF',
    borderColor: '#1A73E8',
  },
  tabFlag: { fontSize: 13 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#5F6368' },
  tabLabelSelected: { color: '#1A73E8' },
});
