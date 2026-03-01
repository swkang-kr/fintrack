import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketIndices } from '@/hooks/useMarket';

export function MarketIndices() {
  const { data: indices = [], isLoading } = useMarketIndices();

  if (isLoading) {
    return (
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.skeleton} />
        ))}
      </View>
    );
  }

  if (indices.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {indices.map((idx) => {
        const isUp = idx.changePercent >= 0;
        return (
          <View key={idx.symbol} style={styles.card}>
            <Text style={styles.name}>{idx.name}</Text>
            <Text style={styles.price} numberOfLines={1}>
              {idx.symbol.startsWith('^KS') || idx.symbol === '^KQ11'
                ? Math.round(idx.price).toLocaleString('ko-KR')
                : idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.change, isUp ? styles.up : styles.down]}>
              {isUp ? '▲' : '▼'} {Math.abs(idx.changePercent).toFixed(2)}%
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  skeleton: {
    width: 110,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#F1F3F4',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 11,
    color: '#9AA0A6',
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '700',
  },
  up: { color: '#E53935' },
  down: { color: '#1565C0' },
});
