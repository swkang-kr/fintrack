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
import { useAiDiscover, useAiUsage } from '@/hooks/useAiReport';
import { AiDiscoverRecommendation, AiDiscoverResult } from '@/types/report';

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

type Risk = 'low' | 'medium' | 'high';

const RISK_LABEL: Record<Risk, string> = { low: '저위험', medium: '중위험', high: '고위험' };
const RISK_COLOR: Record<Risk, string> = { low: '#2E7D32', medium: '#F9A825', high: '#C62828' };
const RISK_BG: Record<Risk, string> = { low: '#E8F5E9', medium: '#FFFDE7', high: '#FEECEC' };

function RecommendationCard({ rec }: { rec: AiDiscoverRecommendation }) {
  const riskColor = RISK_COLOR[rec.risk];
  const riskBg = RISK_BG[rec.risk];

  return (
    <View style={styles.recCard}>
      <View style={styles.recHeader}>
        <View style={styles.recTitleGroup}>
          <Text style={styles.recTicker}>{rec.ticker}</Text>
          <Text style={styles.recName}>{rec.name}</Text>
        </View>
        <View style={styles.badgeGroup}>
          <View style={styles.marketBadge}>
            <Text style={styles.marketBadgeText}>{rec.market}</Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>{RISK_LABEL[rec.risk]}</Text>
          </View>
        </View>
      </View>

      <View style={styles.expectedRow}>
        <Text style={styles.expectedLabel}>예상 수익률</Text>
        <Text style={styles.expectedValue}>{rec.expectedReturn}</Text>
      </View>

      <Text style={styles.recReason}>{rec.reason}</Text>
    </View>
  );
}

export default function AiDiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { holdings, summary, isLoading: holdingsLoading } = useHoldingsWithPnL();
  const { data: rates } = useExchangeRates();
  const { data: usage } = useAiUsage();
  const discoverMutation = useAiDiscover();

  const [result, setResult] = useState<AiDiscoverResult | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const usdKrw = rates?.rates.USD ?? 1350;
  const remaining = usage ? usage.effectiveLimit - usage.usedToday : null;
  const limitReached = remaining !== null && remaining <= 0;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="종목 발굴" />
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="종목 발굴 서비스를 사용하려면 로그인해주세요."
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
        <ScreenHeader title="종목 발굴" />
        <LoadingSpinner message="포트폴리오 불러오는 중..." />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (holdings.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="종목 발굴" />
        <EmptyState
          icon="📂"
          title="보유 종목이 없습니다"
          description="포트폴리오에 종목을 추가하면 내 스타일에 맞는 종목을 추천받을 수 있습니다."
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

    discoverMutation.mutate(
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

  const isPending = discoverMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="종목 발굴" />
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
          <Text style={styles.cardTitle}>내 스타일 기반 종목 추천</Text>
          <Text style={styles.cardDesc}>
            현재 보유 종목의 스타일(성장주/가치주/배당주 등)과 위험 성향을 분석하여 포트폴리오에 어울리는 신규 종목을 추천합니다.
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
                : '종목 추천받기'}
            </Text>
          </Pressable>
        </View>

        {/* Results */}
        {result && (
          <>
            {/* Strategy Overview */}
            <View style={styles.strategyCard}>
              <Text style={styles.strategyLabel}>투자 전략 분석</Text>
              <Text style={styles.strategyText}>{result.strategy}</Text>
            </View>

            {/* Recommendations */}
            <Text style={styles.sectionTitle}>추천 종목 {result.recommendations.length}개</Text>
            {result.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}

            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                * 본 분석은 AI가 생성한 참고 정보이며 투자 권유가 아닙니다.
              </Text>
              <Text style={styles.disclaimerText}>
                * 종목 추천은 현재 보유 종목 스타일을 참고한 아이디어 제공 목적입니다.
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

  strategyCard: {
    ...CARD_BASE,
    backgroundColor: '#EEF4FF',
    gap: 8,
  },
  strategyLabel: { fontSize: 12, fontWeight: '700', color: '#1A73E8' },
  strategyText: { fontSize: 13, color: '#1A1A1A', lineHeight: 20 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },

  recCard: { ...CARD_BASE, gap: 10 },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  recTitleGroup: { flex: 1, gap: 2 },
  recTicker: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  recName: { fontSize: 12, color: '#5F6368' },
  badgeGroup: { gap: 4, alignItems: 'flex-end' },
  marketBadge: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  marketBadgeText: { fontSize: 11, fontWeight: '600', color: '#5F6368' },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  riskBadgeText: { fontSize: 11, fontWeight: '700' },
  expectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  expectedLabel: { fontSize: 12, color: '#5F6368' },
  expectedValue: { fontSize: 14, fontWeight: '700', color: '#1A73E8' },
  recReason: { fontSize: 13, color: '#3C4043', lineHeight: 20 },

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
