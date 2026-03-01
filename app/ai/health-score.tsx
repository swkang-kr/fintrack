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
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useHoldingsWithPnL } from '@/hooks/usePortfolio';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useAiHealthScore, useAiUsage } from '@/hooks/useAiReport';
import { AiHealthScore, AiHealthScoreFactor } from '@/types/report';

function buildHoldingPayload(holdings: ReturnType<typeof useHoldingsWithPnL>['holdings']) {
  return holdings.map((h) => ({
    name: h.name,
    ticker: h.ticker,
    market: h.market,
    quantity: h.quantity,
    avgPrice: h.avg_price,
    currentPrice: h.quote?.price ?? null,
    currency: h.currency,
    pnlPercent: h.quote ? h.pnlPercent : null,
    valueKrw: h.currentValue,
  }));
}

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

const GRADE_COLORS: Record<Grade, string> = {
  A: '#2E7D32',
  B: '#1A73E8',
  C: '#F9A825',
  D: '#E65100',
  F: '#C62828',
};

const GRADE_BG: Record<Grade, string> = {
  A: '#E8F5E9',
  B: '#EEF4FF',
  C: '#FFFDE7',
  D: '#FFF3E0',
  F: '#FEECEC',
};

function ScoreDisplay({ score, grade }: { score: number; grade: Grade }) {
  const color = GRADE_COLORS[grade];
  const bg = GRADE_BG[grade];

  return (
    <View style={[styles.scoreCircle, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={[styles.scoreGrade, { color }]}>{grade}등급</Text>
    </View>
  );
}

function FactorBar({ factor }: { factor: AiHealthScoreFactor }) {
  const fillColor =
    factor.score >= 80
      ? '#2E7D32'
      : factor.score >= 60
      ? '#1A73E8'
      : factor.score >= 40
      ? '#F9A825'
      : '#C62828';

  return (
    <View style={styles.factorItem}>
      <View style={styles.factorHeader}>
        <Text style={styles.factorName}>{factor.name}</Text>
        <Text style={[styles.factorScore, { color: fillColor }]}>{factor.score}점</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${factor.score}%` as unknown as number, backgroundColor: fillColor }]} />
      </View>
      <Text style={styles.factorComment}>{factor.comment}</Text>
    </View>
  );
}

export default function AiHealthScoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { holdings, summary, isLoading: holdingsLoading } = useHoldingsWithPnL();
  const { data: rates } = useExchangeRates();
  const { data: usage } = useAiUsage();
  const healthMutation = useAiHealthScore();

  const [result, setResult] = useState<AiHealthScore | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const usdKrw = rates?.rates.USD ?? 1350;
  const remaining = usage ? usage.effectiveLimit - usage.usedToday : null;
  const limitReached = remaining !== null && remaining <= 0;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="포트폴리오 건강점수" />
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="건강점수 분석을 사용하려면 로그인해주세요."
          actionLabel="로그인하기"
          onAction={() => router.push('/auth/login')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (holdingsLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="포트폴리오 건강점수" />
        <LoadingSpinner message="포트폴리오 불러오는 중..." />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (holdings.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="포트폴리오 건강점수" />
        <EmptyState
          icon="📂"
          title="보유 종목이 없습니다"
          description="포트폴리오에 종목을 추가하면 건강점수를 확인할 수 있습니다."
          actionLabel="종목 추가하기"
          onAction={() => router.push('/holdings/add')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  function handleAnalyze() {
    if (limitReached) {
      Alert.alert('한도 초과', '오늘 AI 사용 한도를 모두 사용했습니다.');
      return;
    }

    healthMutation.mutate(
      {
        holdings: buildHoldingPayload(holdings),
        totalValueKrw: summary.totalValue,
        totalPnlPercent: summary.totalPnlPercent,
        usdKrw,
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

  const isPending = healthMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="포트폴리오 건강점수" />
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

        {/* Analyze Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>포트폴리오 건강점수 분석</Text>
          <Text style={styles.cardDesc}>
            분산도, 수익률, 리스크, 유동성 4개 항목을 종합 평가해 포트폴리오의 건강상태를 점수로 나타냅니다.
          </Text>
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
                : '분석하기'}
            </Text>
          </Pressable>
        </View>

        {/* Score Result */}
        {result && (
          <>
            {/* Score Display */}
            <View style={styles.scoreCard}>
              <ScoreDisplay score={result.score} grade={result.grade} />
              <Text style={styles.scoreSummary}>{result.summary}</Text>
            </View>

            {/* Factor Bars */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>항목별 점수</Text>
              {result.factors.map((factor, i) => (
                <FactorBar key={i} factor={factor} />
              ))}
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                * 본 분석은 AI가 생성한 참고 정보이며 투자 권유가 아닙니다.
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  cardDesc: { fontSize: 13, color: '#5F6368', lineHeight: 20, marginBottom: 16 },

  analyzeBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeBtnDisabled: { backgroundColor: '#C5CACE' },
  analyzeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  scoreCard: {
    ...CARD_BASE,
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontSize: 42, fontWeight: '800' },
  scoreGrade: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  scoreSummary: {
    fontSize: 14,
    color: '#3C4043',
    textAlign: 'center',
    lineHeight: 22,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },

  factorItem: { marginBottom: 14, gap: 6 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorName: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  factorScore: { fontSize: 13, fontWeight: '700' },
  barBg: {
    height: 8,
    backgroundColor: '#F1F3F4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  factorComment: { fontSize: 12, color: '#5F6368', lineHeight: 17 },

  disclaimerBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
  },
  disclaimerText: { fontSize: 11, color: '#795548', lineHeight: 17 },

  bottomPad: { height: 24 },
});
