import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RateCard } from './RateCard';
import { useExchangeRates, useRateChanges } from '@/hooks/useExchangeRates';
import { CurrencyCode } from '@/services/exchangeApi';

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'JPY', 'CNY'];

interface RateListProps {
  selectedCurrency: CurrencyCode;
  onSelect: (currency: CurrencyCode) => void;
}

export function RateList({ selectedCurrency, onSelect }: RateListProps) {
  const { data, isLoading, isError, refetch } = useExchangeRates();
  const { changes } = useRateChanges();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={styles.loadingText}>환율 불러오는 중...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>환율 데이터를 불러오지 못했습니다.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {CURRENCIES.map((currency) => (
        <RateCard
          key={currency}
          currency={currency}
          rate={data.rates[currency]}
          change={changes[currency]}
          isSelected={selectedCurrency === currency}
          onPress={() => onSelect(currency)}
        />
      ))}
      <Text style={styles.source}>
        출처: {data.source === 'bok' ? '한국은행' : 'Frankfurter'} · {data.updatedAt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  errorText: {
    fontSize: 14,
    color: '#E53935',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1A73E8',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  source: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'right',
    marginRight: 20,
    marginTop: 6,
  },
});
