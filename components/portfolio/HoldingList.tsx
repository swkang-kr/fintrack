import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { HoldingCard } from './HoldingCard';
import { NativeAdCard } from '@/components/ads/NativeAdCard';
import { HoldingWithPnL } from '@/types/portfolio';

type ListItem =
  | { type: 'holding'; data: HoldingWithPnL }
  | { type: 'native_ad'; key: string };

interface Props {
  holdings: HoldingWithPnL[];
  ListHeaderComponent?: React.ReactElement;
  ListFooterComponent?: React.ReactElement;
}

/** 5종목마다 네이티브 광고 1개 삽입 */
function buildItems(holdings: HoldingWithPnL[]): ListItem[] {
  return holdings.flatMap((h, i) => {
    const items: ListItem[] = [{ type: 'holding', data: h }];
    if ((i + 1) % 5 === 0 && i < holdings.length - 1) {
      items.push({ type: 'native_ad', key: `ad_${i}` });
    }
    return items;
  });
}

export function HoldingList({ holdings, ListHeaderComponent, ListFooterComponent }: Props) {
  const router = useRouter();
  const items = buildItems(holdings);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) =>
        item.type === 'holding' ? item.data.id : item.key
      }
      renderItem={({ item }) =>
        item.type === 'holding' ? (
          <HoldingCard
            holding={item.data}
            onPress={() => router.push(`/holdings/${item.data.id}`)}
          />
        ) : (
          <NativeAdCard />
        )
      }
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 16 },
});
