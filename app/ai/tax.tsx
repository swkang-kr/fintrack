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
import { useAiTax, useAiUsage } from '@/hooks/useAiReport';
import { AiTaxResult, AiTaxStrategy } from '@/types/report';

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

function TaxSummaryCard({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color?: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryAmount, color ? { color } : undefined]}>
        {formatKRW(amount)}
      </Text>
    </View>
  );
}

function StrategyCard({ strategy }: { strategy: AiTaxStrategy }) {
  return (
    <View style={styles.strategyCard}>
      <View style={styles.strategyHeader}>
        <Text style={styles.strategyTitle}>{strategy.title}</Text>
        <View style={styles.savingBadge}>
          <Text style={styles.savingText}>절세 {formatKRW(strategy.saving)}</Text>
        </View>
      </View>
      <Text style={styles.strategyDesc}>{strategy.description}</Text>
      <View style={styles.actionRow}>
        <Text style={styles.actionLabel}>실행 방법</Text>
        <Text style={styles.actionText}>{strategy.action}</Text>
      </View>
    </View>
  );
}

export default function AiTaxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { holdings, summary, isLoading: holdingsLoading } = useHoldingsWithPnL();
  const { data: rates } = useExchangeRates();
  const { data: usage } = useAiUsage();
  const taxMutation = useAiTax();

  const [result, setResult] = useState<AiTaxResult | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const usdKrw = rates?.rates.USD ?? 1350;
  const remaining = usage ? usage.effectiveLimit - usage.usedToday : null;
  const limitReached = remaining !== null && remaining <= 0;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="세금 최적화" />
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="세금 최적화 분석을 사용하려면 로그인해주세요."
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
        <ScreenHeader title="세금 최적화" />
        <LoadingSpinner message="포트폴리오 불러오는 중..." />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (holdings.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="세금 최적화" />
        <EmptyState
          icon="📂"
          title="보유 종목이 없습니다"
          description="포트폴리오에 종목을 추가하면 세금 최적화 분석을 받을 수 있습니다."
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

    taxMutation.mutate(
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

  const isPending = taxMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="세금 최적화" />
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
          <Text style={styles.cardTitle}>세금 최적화 분석</Text>
          <Text style={styles.cardDesc}>
            보유 종목의 수익/손실 현황을 바탕으로 절세 전략을 제안해드립니다.
            손익통산, 손실 실현 타이밍 등을 분석합니다.
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

        {/* Results */}
        {result && (
          <>
            {/* Summary Row */}
            <View style={styles.summaryRow}>
              <TaxSummaryCard label="현재 예상세금" amount={result.currentTax} color="#C62828" />
              <TaxSummaryCard label="최적화 후 세금" amount={result.optimizedTax} color="#1565C0" />
              <TaxSummaryCard label="절세 효과" amount={result.saving} color="#2E7D32" />
            </View>

            {/* Strategies */}
            <Text style={styles.sectionTitle}>절세 전략</Text>
            {result.strategies.map((strategy, i) => (
              <StrategyCard key={i} strategy={strategy} />
            ))}

            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>{result.disclaimer}</Text>
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

const CARD = {
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

  card: { ...CARD },
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

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: '#5F6368', marginBottom: 4, textAlign: 'center' },
  summaryAmount: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },

  strategyCard: {
    ...CARD,
    gap: 8,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  strategyTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  savingBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  savingText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  strategyDesc: { fontSize: 13, color: '#5F6368', lineHeight: 19 },
  actionRow: { gap: 3 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: '#9AA0A6' },
  actionText: { fontSize: 13, color: '#1A1A1A', lineHeight: 18 },

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
