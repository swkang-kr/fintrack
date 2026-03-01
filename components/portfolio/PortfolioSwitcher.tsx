import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Portfolio } from '@/types/portfolio';

interface Props {
  portfolios: Portfolio[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export function PortfolioSwitcher({
  portfolios,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const selected = portfolios.find((p) => p.id === selectedId) ?? portfolios[0];

  function handleCreate() {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setCreating(false);
  }

  function handleDelete(p: Portfolio) {
    if (portfolios.length <= 1) {
      Alert.alert('삭제 불가', '마지막 포트폴리오는 삭제할 수 없습니다.');
      return;
    }
    Alert.alert(
      '포트폴리오 삭제',
      `"${p.name}" 포트폴리오와 모든 보유 종목을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            onDelete(p.id);
            setOpen(false);
          },
        },
      ]
    );
  }

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.name ?? '포트폴리오'}
        </Text>
        <FontAwesome name="chevron-down" size={11} color="#5F6368" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>포트폴리오 선택</Text>

          <ScrollView style={styles.list}>
            {portfolios.map((p) => (
              <View key={p.id} style={styles.itemRow}>
                <Pressable
                  style={[styles.item, p.id === selectedId && styles.itemSelected]}
                  onPress={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                >
                  <FontAwesome
                    name={p.id === selectedId ? 'dot-circle-o' : 'circle-o'}
                    size={16}
                    color={p.id === selectedId ? '#1A73E8' : '#9AA0A6'}
                  />
                  <Text style={[styles.itemText, p.id === selectedId && styles.itemTextSelected]}>
                    {p.name}
                  </Text>
                </Pressable>
                {portfolios.length > 1 && (
                  <Pressable style={styles.deleteBtn} onPress={() => handleDelete(p)}>
                    <FontAwesome name="trash-o" size={15} color="#9AA0A6" />
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>

          {creating ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="포트폴리오 이름"
                placeholderTextColor="#C5C5C5"
                autoFocus
              />
              <Pressable style={styles.createConfirm} onPress={handleCreate}>
                <Text style={styles.createConfirmText}>추가</Text>
              </Pressable>
              <Pressable onPress={() => setCreating(false)}>
                <FontAwesome name="times" size={18} color="#9AA0A6" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addBtn} onPress={() => setCreating(true)}>
              <FontAwesome name="plus" size={14} color="#1A73E8" />
              <Text style={styles.addBtnText}>새 포트폴리오 추가</Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EAED',
    maxWidth: 180,
  },
  triggerText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', flex: 1 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#E8EAED',
    borderRadius: 2, alignSelf: 'center', marginVertical: 12,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12,
  },
  list: { maxHeight: 280 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F1F3F4',
  },
  itemSelected: {},
  itemText: { fontSize: 15, color: '#1A1A1A' },
  itemTextSelected: { fontWeight: '700', color: '#1A73E8' },
  deleteBtn: { padding: 8 },

  createRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F3F4',
  },
  createInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#1A73E8',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  createConfirm: {
    backgroundColor: '#1A73E8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  createConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F3F4',
  },
  addBtnText: { fontSize: 14, color: '#1A73E8', fontWeight: '600' },
});
