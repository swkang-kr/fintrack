import React, { useState, useRef } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerAdBottom } from '@/components/ads/BannerAd';
import { RewardedAdButton } from '@/components/ads/RewardedAd';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TaxReport } from '@/components/tax/TaxReport';
import { DividendCalendar } from '@/components/portfolio/DividendCalendar';
import { RebalancingCalculator } from '@/components/portfolio/RebalancingCalculator';
import { useAuth } from '@/hooks/useAuth';
import { useHoldingsWithPnL } from '@/hooks/usePortfolio';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useAiReport, useAiUsage, useAiImprove, useAiNews } from '@/hooks/useAiReport';
import { AiReportSection, AiImproveSection, AiNewsResponse } from '@/types/report';
import { toYahooTicker } from '@/services/stockApi';

type InlineResult = 'analyze' | 'improve' | 'news' | null;

interface AiFeatureCard {
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  route?: string;
  inlineKey?: InlineResult;
}

const AI_FEATURES: AiFeatureCard[] = [
  { id: 'analyze', icon: '🤖', title: 'AI 포트폴리오 분석', desc: '종목 분석 & 인사이트', color: '#1A73E8', inlineKey: 'analyze' },
  { id: 'improve', icon: '🎯', title: '포트폴리오 개선 제안', desc: '구체적인 개선 방향', color: '#2E7D32', inlineKey: 'improve' },
  { id: 'news', icon: '📰', title: 'AI 뉴스 브리핑', desc: '보유 종목 최신 뉴스', color: '#6A1B9A', inlineKey: 'news' },
  { id: 'chat', icon: '💬', title: 'AI 투자 챗봇', desc: '맞춤 투자 상담', color: '#00796B', route: '/ai/chat' },
  { id: 'tax', icon: '💰', title: '세금 최적화', desc: '절세 전략 분석', color: '#E65100', route: '/ai/tax' },
  { id: 'health', icon: '💊', title: '포트폴리오 건강점수', desc: '0-100점 진단', color: '#AD1457', route: '/ai/health-score' },
  { id: 'discover', icon: '🔍', title: '종목 발굴', desc: '내 스타일 종목 추천', color: '#1565C0', route: '/ai/discover' },
  { id: 'rebalance', icon: '📋', title: '리밸런싱 플랜', desc: '단계별 매매 계획', color: '#37474F', route: '/ai/rebalance-plan' },
  { id: 'fx', icon: '💱', title: '환율 타이밍', desc: '환전 최적 시점 분석', color: '#558B2F', route: '/ai/fx-timing' },
];

export default function ReportScreen() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const [activeInline, setActiveInline] = useState<InlineResult>(null);

  const { holdings, summary, isLoading: isLoadingHoldings, isError: isErrorHoldings } = useHoldingsWithPnL();
  const { data: ratesData } = useExchangeRates();
  const { data: usageData, isLoading: isLoadingUsage } = useAiUsage();
  const aiReport = useAiReport();
  const aiImprove = useAiImprove();
  const aiNews = useAiNews();

  const [report, setReport] = useState<AiReportSection | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);
  const [improveReport, setImproveReport] = useState<AiImproveSection | null>(null);
  const [improvedAt, setImprovedAt] = useState<Date | null>(null);
  const [newsReport, setNewsReport] = useState<AiNewsResponse | null>(null);
  const [newsAt, setNewsAt] = useState<Date | null>(null);

  const usdKrw = ratesData?.rates.USD ?? 1400;
  const usedToday = usageData?.usedToday ?? 0;
  const limitPerDay = usageData?.limitPerDay ?? 5;
  const bonusToday = usageData?.bonusToday ?? 0;
  const effectiveLimit = usageData?.effectiveLimit ?? limitPerDay;
  const remaining = effectiveLimit - usedToday;
  const isAtLimit = usedToday >= effectiveLimit;

  if (!initialized) return <LoadingSpinner message="초기화 중..." />;

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <EmptyState
          icon="🤖"
          title="로그인이 필요합니다"
          description="AI 포트폴리오 분석을 사용하려면 로그인해주세요."
          actionLabel="로그인 / 회원가입"
          onAction={() => router.push('/auth/login')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  function buildHoldingPayload() {
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

  function handleCardPress(card: AiFeatureCard) {
    if (holdings.length === 0 && !card.route?.includes('chat')) {
      Alert.alert('포트폴리오 없음', '종목을 추가한 후 AI 기능을 사용해주세요.');
      return;
    }
    if (card.route) {
      router.push(card.route as never);
      return;
    }
    if (card.inlineKey) {
      setActiveInline(activeInline === card.inlineKey ? null : card.inlineKey);
      if (card.inlineKey === 'analyze') triggerAnalyze();
      if (card.inlineKey === 'improve') triggerImprove();
      if (card.inlineKey === 'news') triggerNews();
    }
  }

  function triggerAnalyze() {
    if (!holdings.length || isAtLimit || aiReport.isPending) return;
    aiReport.mutate(
      { holdings: buildHoldingPayload(), totalValueKrw: summary.totalValue, totalPnlPercent: summary.totalPnlPercent, usdKrw },
      {
        onSuccess: (data) => { setReport(data.report); setAnalyzedAt(new Date()); },
        onError: (err) => Alert.alert('분석 실패', err.message),
      }
    );
  }

  function triggerImprove() {
    if (!holdings.length || isAtLimit || aiImprove.isPending) return;
    aiImprove.mutate(
      { holdings: buildHoldingPayload(), totalValueKrw: summary.totalValue, totalPnlPercent: summary.totalPnlPercent, usdKrw },
      {
        onSuccess: (data) => { setImproveReport(data.report); setImprovedAt(new Date()); },
        onError: (err) => Alert.alert('분석 실패', err.message),
      }
    );
  }

  function triggerNews() {
    if (!holdings.length || isAtLimit || aiNews.isPending) return;
    const tickers = holdings.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      yahooTicker: toYahooTicker(h.ticker, h.market),
    }));
    aiNews.mutate(tickers, {
      onSuccess: (data) => { setNewsReport(data); setNewsAt(new Date()); },
      onError: (err) => Alert.alert('뉴스 브리핑 실패', err.message),
    });
  }

  const isPendingInline =
    (activeInline === 'analyze' && aiReport.isPending) ||
    (activeInline === 'improve' && aiImprove.isPending) ||
    (activeInline === 'news' && aiNews.isPending);

  const sentimentIcon = (s: string) =>
    s === 'positive' ? '📈' : s === 'negative' ? '📉' : '➡️';
  const sentimentColor = (s: string) =>
    s === 'positive' ? '#E53935' : s === 'negative' ? '#1565C0' : '#5F6368';

  if (isLoadingHoldings) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>분석 리포트</Text>
        </View>
        <LoadingSpinner message="포트폴리오 불러오는 중..." />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (isErrorHoldings) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>분석 리포트</Text>
        </View>
        <EmptyState
          icon="⚠️"
          title="데이터 로드 실패"
          description="포트폴리오를 불러오지 못했습니다."
          actionLabel="새로고침"
          onAction={() => router.replace('/(tabs)/report')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>분석 리포트</Text>
        <Pressable style={styles.historyBtn} onPress={() => router.push('/ai/history')}>
          <Text style={styles.historyBtnText}>📋 내역</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 크레딧 섹션 ── */}
        <View style={styles.creditSection}>
          <View style={styles.creditTop}>
            <View>
              <Text style={styles.creditTitle}>AI 분석 크레딧</Text>
              <Text style={[styles.creditSub, isAtLimit && styles.creditSubLimit]}>
                {isAtLimit
                  ? '오늘 사용 가능한 크레딧이 없습니다'
                  : `오늘 ${remaining}회 분석 가능`}
                {bonusToday > 0 && ` (보너스 +${bonusToday})`}
              </Text>
            </View>
            {!isLoadingUsage && (
              <View style={[styles.creditBadge, isAtLimit && styles.creditBadgeLimit]}>
                <Text style={[styles.creditBadgeText, isAtLimit && styles.creditBadgeTextLimit]}>
                  {usedToday}/{effectiveLimit}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: effectiveLimit > 0 ? `${Math.min((usedToday / effectiveLimit) * 100, 100)}%` : '0%' as any },
                isAtLimit && styles.progressFillLimit,
              ]}
            />
          </View>

          <RewardedAdButton
            disabled={bonusToday >= 15}
            onRewarded={() => {
              // useAiUsage will be invalidated by claimRewardCredit in RewardedAd
            }}
          />
        </View>

        {/* ── AI 기능 그리드 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI 기능</Text>
          <Text style={styles.sectionSub}>탭하면 바로 실행됩니다</Text>
        </View>

        <View style={styles.grid}>
          {AI_FEATURES.map((card) => (
            <Pressable
              key={card.id}
              style={[
                styles.gridCard,
                activeInline === card.inlineKey && card.inlineKey && styles.gridCardActive,
              ]}
              onPress={() => handleCardPress(card)}
            >
              <View style={[styles.gridCardIconWrap, { backgroundColor: `${card.color}18` }]}>
                <Text style={styles.gridCardIcon}>{card.icon}</Text>
              </View>
              <Text style={styles.gridCardTitle} numberOfLines={2}>{card.title}</Text>
              <Text style={styles.gridCardDesc} numberOfLines={1}>{card.desc}</Text>
              {card.route && <Text style={styles.gridCardArrow}>›</Text>}
              {card.inlineKey && activeInline === card.inlineKey && (
                <View style={[styles.activeIndicator, { backgroundColor: card.color }]} />
              )}
            </Pressable>
          ))}
        </View>

        {/* ── 인라인 결과 (analyze / improve / news) ── */}
        {isPendingInline && (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>⏳ AI 분석 중...</Text>
          </View>
        )}

        {activeInline === 'analyze' && report && (
          <View style={styles.inlineResult}>
            <Text style={styles.resultTimestamp}>{analyzedAt ? formatTime(analyzedAt) : ''} 분석 결과</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>📊 포트폴리오 요약</Text>
              <Text style={styles.resultBody}>{report.summary}</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>💡 주요 인사이트</Text>
              {report.insights.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.resultCard, styles.riskCard]}>
              <Text style={styles.resultCardTitle}>⚠️ 리스크 요인</Text>
              {report.risks.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, styles.riskDot]}>•</Text>
                  <Text style={[styles.bulletText, styles.riskText]}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.resultCard, styles.recommendCard]}>
              <Text style={styles.resultCardTitle}>🎯 종합 추천</Text>
              <Text style={styles.recommendText}>{report.recommendation}</Text>
            </View>
            <Text style={styles.disclaimer}>* 본 분석은 AI가 생성한 참고 정보이며 투자 권유가 아닙니다.</Text>
          </View>
        )}

        {activeInline === 'improve' && improveReport && (
          <View style={styles.inlineResult}>
            <Text style={styles.resultTimestamp}>{improvedAt ? formatTime(improvedAt) : ''} 개선 제안</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>📋 현황 평가</Text>
              <Text style={styles.resultBody}>{improveReport.summary}</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>🎯 개선 방향</Text>
              {improveReport.improvements.map((item, i) => (
                <View key={i} style={styles.improveItem}>
                  <View style={[
                    styles.priorityBadge,
                    item.priority === 'high' ? styles.priorityHigh
                      : item.priority === 'medium' ? styles.priorityMedium
                      : styles.priorityLow,
                  ]}>
                    <Text style={styles.priorityText}>
                      {item.priority === 'high' ? '긴급' : item.priority === 'medium' ? '보통' : '권장'}
                    </Text>
                  </View>
                  <Text style={styles.improveTitle}>{item.title}</Text>
                  <Text style={styles.improveDesc}>{item.description}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.disclaimer}>* 본 분석은 AI가 생성한 참고 정보이며 투자 권유가 아닙니다.</Text>
          </View>
        )}

        {activeInline === 'news' && newsReport && (
          <View style={styles.inlineResult}>
            <Text style={styles.resultTimestamp}>{newsAt ? formatTime(newsAt) : ''} 기준</Text>
            <View style={[styles.resultCard, { backgroundColor: '#F8F0FF', borderColor: '#D9C5F9', borderWidth: 1 }]}>
              <Text style={styles.resultCardTitle}>🌐 시장 분위기</Text>
              <Text style={styles.resultBody}>{newsReport.overview}</Text>
            </View>
            {newsReport.briefing.map((item, i) => (
              <View key={i} style={styles.newsCard}>
                <View style={styles.newsCardHeader}>
                  <Text style={styles.newsCardIcon}>{sentimentIcon(item.sentiment)}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.newsCardName}>{item.name}</Text>
                    <Text style={[styles.newsCardSentiment, { color: sentimentColor(item.sentiment) }]}>
                      {item.sentiment === 'positive' ? '긍정적' : item.sentiment === 'negative' ? '부정적' : '중립'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.newsCardSummary}>{item.summary}</Text>
              </View>
            ))}
            <Text style={styles.disclaimer}>* 뉴스는 Yahoo Finance에서 수집하며 정보 제공 목적입니다.</Text>
          </View>
        )}

        {/* ── 구분선 + 툴 섹션 ── */}
        <View style={styles.divider} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>포트폴리오 툴</Text>
        </View>

        {holdings.length === 0 ? (
          <EmptyState
            icon="📊"
            title="포트폴리오가 비어있습니다"
            description="종목을 추가하면 AI 분석 및 툴을 사용할 수 있습니다."
            actionLabel="종목 추가하기"
            onAction={() => router.push('/holdings/add')}
          />
        ) : (
          <>
            {/* 리밸런싱 계산기 */}
            <View style={styles.toolSection}>
              <Text style={styles.toolSectionTitle}>⚖️ 리밸런싱 계산기</Text>
              <RebalancingCalculator
                holdings={holdings}
                totalValue={summary.totalValue}
                usdKrw={usdKrw}
              />
            </View>

            {/* 세금 계산 */}
            <View style={styles.toolSection}>
              <Text style={styles.toolSectionTitle}>📊 세금 계산</Text>
              <TaxReport holdings={holdings} usdKrw={usdKrw} />
            </View>

            {/* 배당 캘린더 */}
            <View style={styles.toolSection}>
              <Text style={styles.toolSectionTitle}>💰 배당 캘린더</Text>
              <DividendCalendar holdings={holdings} />
            </View>
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
      <BannerAdBottom />
    </SafeAreaView>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { flexGrow: 1, paddingBottom: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  historyBtn: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  historyBtnText: { fontSize: 12, fontWeight: '600', color: '#5F6368' },

  // 크레딧 섹션
  creditSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  creditTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  creditTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  creditSub: { fontSize: 12, color: '#5F6368', marginTop: 2 },
  creditSubLimit: { color: '#E53935' },
  creditBadge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditBadgeLimit: { backgroundColor: '#FEF3F2' },
  creditBadgeText: { fontSize: 13, fontWeight: '700', color: '#1A73E8' },
  creditBadgeTextLimit: { color: '#E53935' },
  progressBar: {
    height: 6,
    backgroundColor: '#E8EAED',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1A73E8',
    borderRadius: 3,
  },
  progressFillLimit: { backgroundColor: '#E53935' },

  // 섹션 헤더
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  sectionSub: { fontSize: 11, color: '#9AA0A6' },

  // 2열 그리드
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  gridCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  gridCardActive: {
    borderWidth: 2,
    borderColor: '#1A73E8',
  },
  gridCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  gridCardIcon: { fontSize: 20 },
  gridCardTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', lineHeight: 18 },
  gridCardDesc: { fontSize: 11, color: '#5F6368' },
  gridCardArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 18,
    color: '#BDC1C6',
    fontWeight: '300',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  // 인라인 로딩
  pendingBox: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingText: { fontSize: 14, color: '#5F6368' },

  // 인라인 결과
  inlineResult: { marginHorizontal: 16, gap: 10, marginBottom: 8 },
  resultTimestamp: { fontSize: 11, color: '#9AA0A6', textAlign: 'right' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  riskCard: { backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#FBCCC8' },
  recommendCard: { backgroundColor: '#F0FAF4', borderWidth: 1, borderColor: '#C8EDD5' },
  resultCardTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  resultBody: { fontSize: 13, color: '#3C4043', lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletDot: { fontSize: 16, color: '#1A73E8', lineHeight: 22, marginTop: 1 },
  riskDot: { color: '#E53935' },
  bulletText: { flex: 1, fontSize: 13, color: '#3C4043', lineHeight: 21 },
  riskText: { color: '#C62828' },
  recommendText: { fontSize: 13, color: '#1B5E20', lineHeight: 21, fontWeight: '500' },

  improveItem: { borderLeftWidth: 3, borderLeftColor: '#E8EAED', paddingLeft: 12, gap: 4, marginBottom: 10 },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityHigh: { backgroundColor: '#FEECEC' },
  priorityMedium: { backgroundColor: '#FFF8E1' },
  priorityLow: { backgroundColor: '#E8F5E9' },
  priorityText: { fontSize: 11, fontWeight: '700', color: '#1A1A1A' },
  improveTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  improveDesc: { fontSize: 12, color: '#3C4043', lineHeight: 19 },

  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  newsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newsCardIcon: { fontSize: 24 },
  newsCardName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  newsCardSentiment: { fontSize: 11, fontWeight: '600' },
  newsCardSummary: { fontSize: 12, color: '#3C4043', lineHeight: 19 },

  disclaimer: { fontSize: 11, color: '#9AA0A6', lineHeight: 17, textAlign: 'center', paddingHorizontal: 4 },

  // 구분선
  divider: { height: 8, backgroundColor: '#F1F3F4', marginTop: 8 },

  // 툴 섹션
  toolSection: { marginBottom: 8 },
  toolSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  bottomPad: { height: 16 },
});
