import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { BannerAdBottom } from '@/components/ads/BannerAd';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useAiFxTiming, useAiUsage } from '@/hooks/useAiReport';
import { AiFxTimingAnalyses, AiFxTimingResult, AiFxTimingTarget } from '@/types/report';

type CurrencyKey = 'USD' | 'JPY' | 'EUR' | 'CNY';

const CURRENCIES: { key: CurrencyKey; label: string; flag: string }[] = [
  { key: 'USD', label: '미국 달러', flag: 'US' },
  { key: 'JPY', label: '일본 엔', flag: 'JP' },
  { key: 'EUR', label: '유로', flag: 'EU' },
  { key: 'CNY', label: '중국 위안', flag: 'CN' },
];

type Recommendation = 'buy' | 'sell' | 'wait';
type Confidence = 'high' | 'medium' | 'low';

const REC_LABEL: Record<Recommendation, string> = { buy: '매수', sell: '매도', wait: '관망' };
const REC_COLOR: Record<Recommendation, string> = { buy: '#2E7D32', sell: '#C62828', wait: '#E65100' };
const REC_BG: Record<Recommendation, string> = { buy: '#E8F5E9', sell: '#FEECEC', wait: '#FFF3E0' };
const CONF_LABEL: Record<Confidence, string> = { high: '높음', medium: '보통', low: '낮음' };
const CONF_COLOR: Record<Confidence, string> = { high: '#2E7D32', medium: '#F9A825', low: '#C62828' };

function TargetRow({ target }: { target: AiFxTimingTarget }) {
  const recColor = REC_COLOR[target.action];
  const recBg = REC_BG[target.action];
  const confColor = CONF_COLOR[target.confidence];

  return (
    <View style={styles.targetRow}>
      <Text style={styles.targetLevel}>{target.level.toLocaleString('ko-KR')}원</Text>
      <View style={[styles.targetActionBadge, { backgroundColor: recBg }]}>
        <Text style={[styles.targetActionText, { color: recColor }]}>{REC_LABEL[target.action]}</Text>
      </View>
      <Text style={[styles.targetConf, { color: confColor }]}>
        확신도: {CONF_LABEL[target.confidence]}
      </Text>
    </View>
  );
}

function CurrencyAnalysisCard({ analysis }: { analysis: AiFxTimingResult }) {
  const rec = analysis.recommendation as Recommendation;
  const recColor = REC_COLOR[rec];
  const recBg = REC_BG[rec];

  return (
    <View style={styles.analysisCard}>
      {/* Header */}
      <View style={styles.analysisHeader}>
        <View>
          <Text style={styles.analysisCurrency}>{analysis.currency}/KRW</Text>
          <Text style={styles.analysisRate}>
            {analysis.currentRate.toLocaleString('ko-KR')}원
          </Text>
        </View>
        <View style={[styles.recBadge, { backgroundColor: recBg }]}>
          <Text style={[styles.recBadgeText, { color: recColor }]}>{REC_LABEL[rec]}</Text>
        </View>
      </View>

      {/* Timing */}
      <View style={styles.timingRow}>
        <Text style={styles.timingLabel}>타이밍</Text>
        <Text style={styles.timingValue}>{analysis.timing}</Text>
      </View>

      {/* Analysis Text */}
      <Text style={styles.analysisText}>{analysis.analysis}</Text>

      {/* Targets */}
      {analysis.targets.length > 0 && (
        <View style={styles.targetsSection}>
          <Text style={styles.targetsSectionTitle}>목표 환율</Text>
          {analysis.targets.map((t, i) => (
            <TargetRow key={i} target={t} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function AiFxTimingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: rates } = useExchangeRates();
  const { data: usage } = useAiUsage();
  const fxMutation = useAiFxTiming();

  const [selected, setSelected] = useState<Set<CurrencyKey>>(new Set(['USD', 'JPY', 'EUR']));
  const [result, setResult] = useState<AiFxTimingAnalyses | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const remaining = usage ? usage.effectiveLimit - usage.usedToday : null;
  const limitReached = remaining !== null && remaining <= 0;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="환율 타이밍 분석" />
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="환율 타이밍 분석을 사용하려면 로그인해주세요."
          actionLabel="로그인하기"
          onAction={() => router.push('/auth/login')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  function toggleCurrency(key: CurrencyKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev; // minimum 1 selected
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleAnalyze() {
    if (limitReached) {
      Alert.alert('한도 초과', '오늘 AI 사용 한도를 모두 사용했습니다.');
      return;
    }
    if (selected.size === 0) {
      Alert.alert('통화 선택', '분석할 통화를 하나 이상 선택해주세요.');
      return;
    }

    const ratesMap: Record<string, number> = {};
    if (rates?.rates) {
      for (const key of Array.from(selected)) {
        const rate = rates.rates[key as keyof typeof rates.rates];
        if (rate) ratesMap[key] = rate;
      }
    }

    fxMutation.mutate(
      {
        currencies: Array.from(selected),
        rates: ratesMap,
        usdKrw: rates?.rates.USD ?? 1350,
      },
      {
        onSuccess: (data) => {
          setResult(data.report);
          setAnalyzedAt(new Date());
        },
        onError: (err: unknown) => {
          Alert.alert('오류', err instanceof Error ? err.message : '분석 요청에 실패했습니다.');
        },
      }
    );
  }

  const isPending = fxMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="환율 타이밍 분석" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Credit Badge */}
        <View style={styles.creditRow}>
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>
              {remaining !== null ? `오늘 ${remaining}/${usage?.effectiveLimit}회 가능` : '로딩 중...'}
            </Text>
          </View>
          {analyzedAt && (
            <Text style={styles.analyzedAt}>
              분석 시각: {analyzedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {/* Selector Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>분석할 통화 선택</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map(({ key, label }) => {
              const isSelected = selected.has(key);
              const currentRate = rates?.rates[key as keyof typeof rates.rates];
              return (
                <Pressable
                  key={key}
                  style={[styles.currencyChip, isSelected && styles.currencyChipSelected]}
                  onPress={() => toggleCurrency(key)}
                >
                  <Text style={[styles.currencyCode, isSelected && styles.currencyCodeSelected]}>
                    {key}
                  </Text>
                  <Text style={[styles.currencyLabel, isSelected && styles.currencyLabelSelected]}>
                    {label}
                  </Text>
                  {currentRate && (
                    <Text style={[styles.currencyRate, isSelected && styles.currencyRateSelected]}>
                      {currentRate.toLocaleString('ko-KR')}원
                    </Text>
                  )}
                  <View style={[styles.checkDot, isSelected && styles.checkDotSelected]}>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.analyzeBtn,
              (isPending || limitReached) && styles.analyzeBtnDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={isPending || limitReached}
          >
            <Text style={styles.analyzeBtnText}>
              {isPending
                ? '분석 중...'
                : limitReached
                ? '오늘 한도 초과'
                : `${selected.size}개 통화 분석하기`}
            </Text>
          </Pressable>
        </View>

        {/* Results */}
        {result && (
          <>
            {/* Overview */}
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>종합 분석</Text>
              <Text style={styles.overviewText}>{result.overview}</Text>
            </View>

            {/* Currency Cards */}
            {result.analyses.map((analysis, i) => (
              <CurrencyAnalysisCard key={i} analysis={analysis} />
            ))}

            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                * 본 분석은 AI가 생성한 참고 정보이며 투자 권유가 아닙니다.
              </Text>
              <Text style={styles.disclaimerText}>
                * 환율은 다양한 외부 요인에 의해 예측과 다르게 움직일 수 있습니다.
              </Text>
            </View>
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
      <BannerAdBottom />
    </SafeAreaView>
  );
}

const CARD_BASE = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 18,
  marginHorizontal: 16,
  marginTop: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingTop: 4 },

  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  creditBadge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  creditText: { fontSize: 12, fontWeight: '600', color: '#1A73E8' },
  analyzedAt: { fontSize: 11, color: '#9AA0A6' },

  card: { ...CARD_BASE },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },

  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  currencyChip: {
    width: '47%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    padding: 12,
    gap: 2,
    position: 'relative',
  },
  currencyChipSelected: {
    backgroundColor: '#EEF4FF',
    borderColor: '#1A73E8',
  },
  currencyCode: { fontSize: 16, fontWeight: '800', color: '#5F6368' },
  currencyCodeSelected: { color: '#1A73E8' },
  currencyLabel: { fontSize: 11, color: '#9AA0A6' },
  currencyLabelSelected: { color: '#1A73E8' },
  currencyRate: { fontSize: 12, fontWeight: '600', color: '#5F6368', marginTop: 4 },
  currencyRateSelected: { color: '#1A73E8' },
  checkDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotSelected: {
    backgroundColor: '#1A73E8',
    borderColor: '#1A73E8',
  },
  checkMark: { fontSize: 10, color: '#fff', fontWeight: '700' },

  analyzeBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeBtnDisabled: { backgroundColor: '#C5CACE' },
  analyzeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  overviewCard: {
    ...CARD_BASE,
    backgroundColor: '#EEF4FF',
    gap: 8,
  },
  overviewLabel: { fontSize: 12, fontWeight: '700', color: '#1A73E8' },
  overviewText: { fontSize: 13, color: '#1A1A1A', lineHeight: 20 },

  analysisCard: { ...CARD_BASE, gap: 12 },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  analysisCurrency: { fontSize: 13, fontWeight: '600', color: '#5F6368' },
  analysisRate: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginTop: 2 },
  recBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  recBadgeText: { fontSize: 14, fontWeight: '800' },
  timingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
  },
  timingLabel: { fontSize: 12, fontWeight: '700', color: '#5F6368', flexShrink: 0 },
  timingValue: { fontSize: 12, color: '#1A1A1A', flex: 1, lineHeight: 18 },
  analysisText: { fontSize: 13, color: '#3C4043', lineHeight: 20 },

  targetsSection: { gap: 8 },
  targetsSectionTitle: { fontSize: 12, fontWeight: '700', color: '#5F6368' },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  targetLevel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  targetActionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  targetActionText: { fontSize: 12, fontWeight: '700' },
  targetConf: { fontSize: 11 },

  disclaimerBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    gap: 4,
  },
  disclaimerText: { fontSize: 11, color: '#795548', lineHeight: 17 },

  bottomPad: { height: 24 },
});
