import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useStockSearch } from '@/hooks/useStock';
import { useAddWatchlist } from '@/hooks/useWatchlist';
import { StockSearchResult } from '@/services/stockApi';

export default function AddWatchlistScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: searchResults = [], isLoading: searching } = useStockSearch(query);
  const addWatchlist = useAddWatchlist();

  async function handleSelect(result: StockSearchResult) {
    try {
      await addWatchlist.mutateAsync({
        ticker: result.ticker,
        name: result.name,
        market: result.market,
        currency: result.currency,
      });
      router.back();
    } catch (err: unknown) {
      Alert.alert('오류', err instanceof Error ? err.message : '추가에 실패했습니다.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="관심종목 추가" modal />
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
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.resultMeta}>
                {item.ticker} · {item.market}
              </Text>
            </View>
            <Text style={styles.resultCurrency}>{item.currency}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
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
});
