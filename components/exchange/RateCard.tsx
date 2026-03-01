import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CurrencyCode } from '@/services/exchangeApi';

const CURRENCY_META: Record<CurrencyCode, { flag: string; label: string }> = {
  USD: { flag: '🇺🇸', label: 'US 달러' },
  EUR: { flag: '🇪🇺', label: '유로' },
  JPY: { flag: '🇯🇵', label: '일본 엔' },
  CNY: { flag: '🇨🇳', label: '중국 위안' },
};

interface RateCardProps {
  currency: CurrencyCode;
  rate: number;
  change?: number;
  isSelected?: boolean;
  onPress?: () => void;
}

export function RateCard({ currency, rate, change, isSelected, onPress }: RateCardProps) {
  const meta = CURRENCY_META[currency];
  const decimals = currency === 'JPY' ? 4 : 2;

  const isUp = (change ?? 0) > 0;
  const isDown = (change ?? 0) < 0;

  function formatRate(value: number): string {
    const fixed = value.toFixed(decimals);
    const [int, dec] = fixed.split('.');
    return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
  }

  function formatChange(value: number): string {
    const abs = Math.abs(value).toFixed(decimals);
    return (isUp ? '▲ +' : '▼ -') + abs;
  }

  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      android_ripple={{ color: '#E8F0FE' }}
    >
      {isSelected && <View style={styles.selectedBar} />}

      <View style={styles.left}>
        <Text style={styles.flag}>{meta.flag}</Text>
        <View>
          <Text style={styles.currency}>{currency}</Text>
          <Text style={styles.label}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.rate}>{formatRate(rate)}</Text>
        {change !== undefined && isUp && (
          <Text style={[styles.change, styles.up]}>{formatChange(change)}</Text>
        )}
        {change !== undefined && isDown && (
          <Text style={[styles.change, styles.down]}>{formatChange(change)}</Text>
        )}
        {change !== undefined && !isUp && !isDown && (
          <Text style={styles.neutral}>─ 변동없음</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: '#EEF4FF',
    borderWidth: 1.5,
    borderColor: '#1A73E8',
  },
  selectedBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: '#1A73E8',
    borderRadius: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  currency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  rate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  up: {
    color: '#E53935', // 한국 증시: 상승 = 빨강
  },
  down: {
    color: '#1565C0', // 한국 증시: 하락 = 파랑
  },
  neutral: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
});
