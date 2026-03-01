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
import { useAiRebalancePlan, useAiUsage } from '@/hooks/useAiReport';
import { AiRebalancePlanResult, AiRebalancePlanStep } from '@/types/report';

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

function formatKRW(amount: number): string {
  return `₩${Math.abs(amount).toLocaleString('ko-KR')}`;
}

function StepCard({ step }: { step: AiRebalancePlanStep }) {
  const isBuy = step.action === 'buy';
  const actionColor = isBuy ? '#C62828' : '#1565C0';
  const actionBg = isBuy ? '#FEECEC' : '#E3F2FD';
  const actionLabel = isBuy ? '매수' : '매도';

  return (
    <View style={styles.stepCard}>
      {/* Step Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepNumber}>{step.step}</Text>
        </View>
        <View style={styles.stepInfo}>
          <View style={styles.stepTitleRow}>
            <Text style={styles.stepTicker}>{step.ticker}</Text>
            <Text style={styles.stepName} numberOfLines={1}>{step.name}</Text>
            <View style={[styles.actionBadge, { backgroundColor: actionBg }]}>
              <Text style={[styles.actionBadgeText, { color: actionColor }]}>{actionLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Step Details */}
      <View style={styles.stepDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>수량</Text>
          <Text style={styles.detailValue}>{step.quantity.toLocaleString('ko-KR')}주</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>예상 금액</Text>
          <Text style={[styles.detailValue, { color: actionColor }]}>
            {formatKRW(step.estimatedAmount)}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <View style={styles.reasonBox}>
        <Text style={styles.reasonText}>{step.reason}</Text>
      </View>
    </View>
  );
}

export default function AiRebalancePlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { holdings, summary, isLoading: holdingsLoading } = useHoldingsWithPnL();
  const { data: rates } = useExchangeRates();
  const { data: usage } = useAiUsage();
  const rebalanceMutation = useAiRebalancePlan();

  const [result, setResult] = useState<AiRebalancePlanResult | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const usdKrw = rates?.rates.USD ?? 1350;
  const remaining = usage ? usage.effectiveLimit - usage.usedToday : null;
  const limitReached = remaining !== null && remaining <= 0;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="리밸런싱 실행 플랜" />
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="리밸런싱 플랜을 사용하려면 로그인해주세요."
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
        <ScreenHeader title="리밸런싱 실행 플랜" />
        <LoadingSpinner message="포트폴리오 불러오는 중..." />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (holdings.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="리밸런싱 실행 플랜" />
        <EmptyState
          icon="📂"
          title="보유 종목이 없습니다"
          description="포트폴리오에 종목을 추가하면 리밸런싱 실행 플랜을 받을 수 있습니다."
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

    rebalanceMutation.mutate(
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

  const isPending = rebalanceMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="리밸런싱 실행 플랜" />
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
          <Text style={styles.cardTitle}>리밸런싱 실행 플랜 생성</Text>
          <Text style={styles.cardDesc}>
            현재 포트폴리오의 자산 배분을 분석하고, 최적의 균형을 위한 매수/매도 실행 순서를 단계별로 제안합니다.
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
                ? '플랜 생성 중...'
                : limitReached
                ? '오늘 한도 초과'
                : '실행 플랜 생성'}
            </Text>
          </Pressable>
        </View>

        {/* Results */}
        {result && (
          <>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>플랜 요약</Text>
                <View style={styles.transactionBadge}>
                  <Text style={styles.transactionText}>총 {result.totalTransactions}건</Text>
                </View>
              </View>
              <Text style={styles.summaryBody}>{result.summary}</Text>
            </View>

            {/* Steps */}
            <Text style={styles.sectionTitle}>실행 단계</Text>
            {result.steps.map((step, i) => (
              <StepCard key={i} step={step} />
            ))}

            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                * 본 분석은 AI가 생성한 참고 정보이며 투자 권유가 아닙니다.
              </Text>
              <Text style={styles.disclaimerText}>
                * 실제 거래 시 수수료, 세금, 시장 상황을 반드시 고려하세요.
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

  summaryCard: {
    ...CARD_BASE,
    backgroundColor: '#EEF4FF',
    gap: 10,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  transactionBadge: {
    backgroundColor: '#1A73E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  summaryBody: { fontSize: 13, color: '#3C4043', lineHeight: 20 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },

  stepCard: { ...CARD_BASE, gap: 10 },
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumber: { fontSize: 14, fontWeight: '800', color: '#fff' },
  stepInfo: { flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stepTicker: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  stepName: { fontSize: 12, color: '#5F6368', flex: 1 },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  actionBadgeText: { fontSize: 12, fontWeight: '700' },

  stepDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#5F6368' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  reasonBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#1A73E8',
    paddingLeft: 10,
  },
  reasonText: { fontSize: 12, color: '#5F6368', lineHeight: 18 },

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
