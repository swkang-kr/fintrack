import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { usePortfolio, useAddHolding } from '@/hooks/usePortfolio';
import { scanPortfolioImage, ScannedHolding } from '@/services/scanApi';

interface EditableHolding extends ScannedHolding {
  id: string;           // 로컬 식별자
  selected: boolean;    // 추가 여부
  quantityStr: string;
  avgPriceStr: string;
}

export default function ScanScreen() {
  const router = useRouter();
  const { data: portfolio } = usePortfolio();
  const addHolding = useAddHolding();

  const [step, setStep] = useState<'pick' | 'loading' | 'review' | 'saving'>('pick');
  const [aiMessage, setAiMessage] = useState('');
  const [holdings, setHoldings] = useState<EditableHolding[]>([]);

  // ── 이미지 선택 ────────────────────────────────────────
  async function pickImage(from: 'camera' | 'gallery') {
    let result: ImagePicker.ImagePickerResult;

    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진 라이브러리 권한이 필요합니다.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });
    }

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    const base64 = asset.base64!;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setStep('loading');
    try {
      const data = await scanPortfolioImage(base64, mimeType);
      setAiMessage(data.message);

      if (data.holdings.length === 0) {
        Alert.alert(
          '종목 미감지',
          '이미지에서 종목을 찾지 못했습니다.\n' +
          '증권사 보유종목 화면을 명확하게 촬영해주세요.',
          [{ text: '다시 시도', onPress: () => setStep('pick') }]
        );
        return;
      }

      const editable: EditableHolding[] = data.holdings.map((h, i) => ({
        ...h,
        id: `${i}-${h.ticker}`,
        selected: true,
        quantityStr: h.quantity > 0 ? String(h.quantity) : '',
        avgPriceStr: h.avg_price > 0 ? String(h.avg_price) : '',
      }));
      setHoldings(editable);
      setStep('review');
    } catch (err) {
      Alert.alert('분석 실패', err instanceof Error ? err.message : '다시 시도해주세요.');
      setStep('pick');
    }
  }

  // ── 필드 수정 ─────────────────────────────────────────
  function updateField(id: string, field: 'quantityStr' | 'avgPriceStr', value: string) {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  }

  function toggleSelect(id: string) {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
    );
  }

  // ── 일괄 저장 ─────────────────────────────────────────
  async function handleSaveAll() {
    if (!portfolio) return;

    const selected = holdings.filter((h) => h.selected);
    const invalid = selected.filter((h) => {
      const q = parseFloat(h.quantityStr);
      const p = parseFloat(h.avgPriceStr);
      return isNaN(q) || q <= 0 || isNaN(p) || p <= 0;
    });

    if (invalid.length > 0) {
      Alert.alert(
        '입력 오류',
        `${invalid.map((h) => h.name).join(', ')}의 수량 또는 단가를 확인해주세요.`
      );
      return;
    }

    setStep('saving');
    let successCount = 0;
    let failCount = 0;

    for (const h of selected) {
      try {
        await addHolding.mutateAsync({
          portfolio_id: portfolio.id,
          ticker: h.ticker,
          name: h.name,
          market: h.market,
          quantity: parseFloat(h.quantityStr),
          avg_price: parseFloat(h.avgPriceStr),
          currency: h.currency,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount > 0) {
      Alert.alert(
        '일부 실패',
        `${successCount}개 추가 성공, ${failCount}개 실패.\n실패한 종목은 수동으로 추가해주세요.`,
        [{ text: '확인', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        '✅ 완료',
        `${successCount}개 종목이 포트폴리오에 추가되었습니다.`,
        [{ text: '확인', onPress: () => router.back() }]
      );
    }
  }

  const selectedCount = holdings.filter((h) => h.selected).length;

  // ── Step: 이미지 선택 ──────────────────────────────────
  if (step === 'pick') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="사진으로 등록" modal />
        <ScrollView contentContainerStyle={styles.pickContainer}>
          <Text style={styles.pickTitle}>증권사 앱 스크린샷을 업로드하세요</Text>
          <Text style={styles.pickDesc}>
            보유 종목 화면을 캡처하면 AI가 자동으로{'\n'}종목명, 수량, 평균단가를 읽어옵니다.
          </Text>

          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>📱 이런 화면을 촬영하세요</Text>
            <Text style={styles.exampleItem}>• 키움증권 / NH투자증권 / 미래에셋</Text>
            <Text style={styles.exampleItem}>• 보유종목 목록 화면</Text>
            <Text style={styles.exampleItem}>• 종목명, 수량, 평균단가가 보이는 화면</Text>
          </View>

          <Pressable style={styles.pickBtn} onPress={() => pickImage('camera')}>
            <Text style={styles.pickBtnIcon}>📷</Text>
            <View>
              <Text style={styles.pickBtnTitle}>카메라로 촬영</Text>
              <Text style={styles.pickBtnDesc}>증권사 앱 화면을 직접 촬영</Text>
            </View>
          </Pressable>

          <Pressable style={[styles.pickBtn, styles.pickBtnAlt]} onPress={() => pickImage('gallery')}>
            <Text style={styles.pickBtnIcon}>🖼️</Text>
            <View>
              <Text style={styles.pickBtnTitleAlt}>갤러리에서 선택</Text>
              <Text style={styles.pickBtnDescAlt}>저장된 스크린샷 불러오기</Text>
            </View>
          </Pressable>

          <Text style={styles.privacyNote}>
            🔒 이미지는 분석 후 즉시 삭제되며 저장되지 않습니다.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step: AI 분석 중 ──────────────────────────────────
  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="사진으로 등록" modal />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A73E8" />
          <Text style={styles.loadingTitle}>AI가 이미지를 분석 중입니다...</Text>
          <Text style={styles.loadingDesc}>
            종목명, 수량, 평균단가를{'\n'}자동으로 인식하고 있어요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: 결과 검토 ──────────────────────────────────
  if (step === 'review' || step === 'saving') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="결과 확인" modal />
        <ScrollView style={styles.reviewScroll} contentContainerStyle={styles.reviewContent}>
          {/* 요약 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>🤖 {aiMessage}</Text>
            <Text style={styles.summaryHint}>
              정보를 확인하고 수정한 후 추가하세요.
            </Text>
          </View>

          {/* 전체 선택/해제 */}
          <View style={styles.selectAllRow}>
            <Text style={styles.selectAllLabel}>{selectedCount}/{holdings.length}개 선택됨</Text>
            <Pressable
              onPress={() => {
                const allSelected = holdings.every((h) => h.selected);
                setHoldings((prev) => prev.map((h) => ({ ...h, selected: !allSelected })));
              }}
            >
              <Text style={styles.selectAllBtn}>
                {holdings.every((h) => h.selected) ? '전체 해제' : '전체 선택'}
              </Text>
            </Pressable>
          </View>

          {/* 종목 카드 목록 */}
          {holdings.map((h) => (
            <View key={h.id} style={[styles.holdingCard, !h.selected && styles.holdingCardDeselected]}>
              {/* 헤더: 종목명 + 선택 토글 */}
              <Pressable style={styles.holdingCardHeader} onPress={() => toggleSelect(h.id)}>
                <View style={styles.holdingCardHeaderLeft}>
                  <View style={[styles.checkbox, h.selected && styles.checkboxSelected]}>
                    {h.selected && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <View>
                    <Text style={styles.holdingName}>{h.name}</Text>
                    <Text style={styles.holdingMeta}>
                      {h.ticker} · {h.market} · {h.currency}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* 수량·단가 입력 (선택된 경우만) */}
              {h.selected && (
                <View style={styles.holdingFields}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>수량</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={h.quantityStr}
                      onChangeText={(v) => updateField(h.id, 'quantityStr', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      selectTextOnFocus
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      평균단가 ({h.currency === 'USD' ? '$' : '₩'})
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={h.avgPriceStr}
                      onChangeText={(v) => updateField(h.id, 'avgPriceStr', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* 다시 찍기 */}
          <Pressable style={styles.retakeBtn} onPress={() => setStep('pick')}>
            <Text style={styles.retakeBtnText}>📷 다른 사진으로 다시 시도</Text>
          </Pressable>
        </ScrollView>

        {/* 저장 버튼 */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, (selectedCount === 0 || step === 'saving') && styles.saveBtnDisabled]}
            onPress={handleSaveAll}
            disabled={selectedCount === 0 || step === 'saving'}
          >
            <Text style={styles.saveBtnText}>
              {step === 'saving'
                ? '저장 중...'
                : `${selectedCount}개 종목 포트폴리오에 추가`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  // ── 이미지 선택 ──
  pickContainer: {
    padding: 20,
    gap: 16,
    alignItems: 'stretch',
  },
  pickTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 8,
  },
  pickDesc: {
    fontSize: 14,
    color: '#5F6368',
    textAlign: 'center',
    lineHeight: 22,
  },

  exampleBox: {
    backgroundColor: '#EEF4FF',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  exampleTitle: { fontSize: 14, fontWeight: '700', color: '#1A73E8', marginBottom: 4 },
  exampleItem: { fontSize: 13, color: '#3C4043', lineHeight: 20 },

  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#1A73E8',
    borderRadius: 16,
    padding: 20,
  },
  pickBtnAlt: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAED' },
  pickBtnIcon: { fontSize: 36 },
  pickBtnTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pickBtnTitleAlt: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  pickBtnDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  pickBtnDescAlt: { fontSize: 12, color: '#5F6368', marginTop: 2 },

  privacyNote: {
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },

  // ── 로딩 ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  loadingDesc: { fontSize: 14, color: '#5F6368', textAlign: 'center', lineHeight: 22 },

  // ── 결과 검토 ──
  reviewScroll: { flex: 1 },
  reviewContent: { padding: 16, gap: 12 },

  summaryCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  summaryText: { fontSize: 14, fontWeight: '700', color: '#1A73E8' },
  summaryHint: { fontSize: 12, color: '#5F6368' },

  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  selectAllLabel: { fontSize: 13, color: '#5F6368', fontWeight: '600' },
  selectAllBtn: { fontSize: 13, color: '#1A73E8', fontWeight: '600' },

  holdingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  holdingCardDeselected: { opacity: 0.5 },
  holdingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  holdingCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1A73E8',
    borderColor: '#1A73E8',
  },
  checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  holdingName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  holdingMeta: { fontSize: 11, color: '#9AA0A6', marginTop: 2 },

  holdingFields: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    paddingTop: 12,
  },
  fieldGroup: { flex: 1, gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9AA0A6' },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: '#1A73E8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'right',
  },

  retakeBtn: {
    alignItems: 'center',
    padding: 12,
  },
  retakeBtnText: { fontSize: 13, color: '#9AA0A6' },

  // ── 푸터 ──
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
    padding: 16,
  },
  saveBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#BDD7FB' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
