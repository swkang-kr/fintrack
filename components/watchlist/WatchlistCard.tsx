import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { WatchlistWithQuote } from '@/hooks/useWatchlist';

interface Props {
  item: WatchlistWithQuote;
  onDelete: (id: string) => void;
  onAddToPortfolio: (item: WatchlistWithQuote) => void;
}

export function WatchlistCard({ item, onDelete, onAddToPortfolio }: Props) {
  const { name, ticker, market, currency, currentPrice, changePercent, change } = item;
  const hasQuote = currentPrice != null && changePercent != null;
  const isUp = (changePercent ?? 0) >= 0;
  const decimals = currency === 'KRW' ? 0 : 2;

  function formatPrice(value: number): string {
    if (currency === 'KRW') return '₩' + Math.round(value).toLocaleString('ko-KR');
    return '$' + value.toFixed(2);
  }

  function handleDelete() {
    Alert.alert('관심종목 삭제', `${name}을(를) 관심종목에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }

  return (
    <View style={styles.card}>
      {/* 상단: 종목명 + 수익률 + 삭제 */}
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta}>
            {ticker} · {market}
          </Text>
        </View>
        <View style={styles.rightSection}>
          {hasQuote ? (
            <Text style={[styles.changePct, isUp ? styles.up : styles.down]}>
              {isUp ? '▲' : '▼'} {Math.abs(changePercent!).toFixed(2)}%
            </Text>
          ) : (
            <Text style={styles.noQuote}>시세 없음</Text>
          )}
          <Pressable style={styles.deleteBtn} onPress={handleDelete} hitSlop={8}>
            <FontAwesome name="trash-o" size={15} color="#9AA0A6" />
          </Pressable>
        </View>
      </View>

      {/* 하단: 현재가 + 포트폴리오 추가 버튼 */}
      <View style={[styles.row, styles.bottomRow]}>
        <View>
          {hasQuote ? (
            <>
              <Text style={styles.currentPrice}>{formatPrice(currentPrice!)}</Text>
              <Text style={[styles.change, isUp ? styles.up : styles.down]}>
                {isUp ? '+' : ''}
                {change!.toFixed(decimals)}
              </Text>
            </>
          ) : (
            <Text style={styles.noQuotePrice}>--</Text>
          )}
        </View>
        <Pressable style={styles.addBtn} onPress={() => onAddToPortfolio(item)}>
          <Text style={styles.addBtnText}>+ 포트폴리오</Text>
        </Pressable>
      </View>
    </View>
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
  name: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  meta: { fontSize: 12, color: '#9AA0A6', marginTop: 2 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  changePct: { fontSize: 14, fontWeight: '700' },
  noQuote: { fontSize: 12, color: '#9AA0A6', fontWeight: '500' },
  deleteBtn: { padding: 2 },
  bottomRow: { marginTop: 10 },
  currentPrice: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  change: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  noQuotePrice: { fontSize: 15, fontWeight: '700', color: '#BDBDBD' },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },
  addBtn: {
    backgroundColor: '#EEF4FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1A73E8',
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#1A73E8' },
});
