import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  modal?: boolean;   // true: ×(닫기), false: ←(뒤로)
  onBack?: () => void;
}

export function ScreenHeader({ title, modal = false, onBack }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleBack() {
    if (onBack) onBack();
    else router.back();
  }

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.inner}>
        <Pressable style={styles.btn} onPress={handleBack} hitSlop={10}>
          <FontAwesome
            name={modal ? 'times' : 'chevron-left'}
            size={modal ? 17 : 15}
            color="#1A1A1A"
          />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 8,
  },
  spacer: { width: 36 },
});
