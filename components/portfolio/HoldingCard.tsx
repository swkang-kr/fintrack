import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HoldingWithPnL } from '@/types/portfolio';

interface Props {
  holding: HoldingWithPnL;
  onPress?: () => void;
}

export function HoldingCard({ holding, onPress }: Props) {
  const { name, ticker, market, quantity, avg_price, currency, currentPrice, pnl, pnlPercent, quote } =
    holding;

  const isUp = pnl >= 0;
  const decimals = currency === 'KRW' ? 0 : 2;

  function formatPrice(value: number): string {
    if (currency === 'KRW') return '₩' + Math.round(value).toLocaleString('ko-KR');
    return '$' + value.toFixed(2);
  }

  function formatPnl(): string {
    const prefix = isUp ? '▲ +' : '▼ ';
    return `${prefix}${pnlPercent.toFixed(2)}%`;
  }

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      android_ripple={{ color: '#F1F3F4' }}
    >
      {/* 상단: 종목명 + 수익률 */}
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta}>
            {ticker} · {market}
          </Text>
        </View>
        {quote ? (
          <Text style={[styles.pnlPct, isUp ? styles.up : styles.down]}>
            {formatPnl()}
          </Text>
        ) : (
          <Text style={styles.noQuote}>시세 없음</Text>
        )}
      </View>

      {/* 하단: 보유 수량 + 현재가 */}
      <View style={[styles.row, styles.bottomRow]}>
        <Text style={styles.quantity}>
          {quantity.toLocaleString()}주 × {formatPrice(avg_price)}
        </Text>
        <View style={styles.right}>
          {quote ? (
            <>
              <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
              <Text style={[styles.change, isUp ? styles.up : styles.down]}>
                {isUp ? '+' : ''}{quote.change.toFixed(decimals)}
              </Text>
            </>
          ) : (
            <Text style={styles.noQuotePrice}>--</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flex: 1, marginRight: 12 },
  right: { alignItems: 'flex-end' },
  name: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  meta: { fontSize: 12, color: '#9AA0A6', marginTop: 2 },
  pnlPct: { fontSize: 14, fontWeight: '700' },
  bottomRow: { marginTop: 10 },
  quantity: { fontSize: 12, color: '#9AA0A6' },
  currentPrice: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  change: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },
  noQuote: { fontSize: 12, color: '#9AA0A6', fontWeight: '500' },
  noQuotePrice: { fontSize: 15, fontWeight: '700', color: '#BDBDBD' },
});
