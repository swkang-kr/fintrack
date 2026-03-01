import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAiHistory } from '@/hooks/useAiReport';
import {
  AiHistoryItem,
  AiImproveSection,
  AiNewsItem,
  AiReportSection,
  AiReportType,
} from '@/types/report';

type ExpandedKey = string;

const TYPE_META: Record<AiReportType, { label: string; icon: string; color: string; bg: string }> = {
  analyze:          { label: 'AI 포트폴리오 분석',  icon: '🤖', color: '#1A73E8', bg: '#EEF4FF' },
  improve:          { label: '포트폴리오 개선 제안', icon: '🎯', color: '#2E7D32', bg: '#E8F5E9' },
  news:             { label: 'AI 뉴스 브리핑',       icon: '📰', color: '#6A1B9A', bg: '#F3E5F5' },
  chat:             { label: 'AI 투자 챗봇',          icon: '💬', color: '#00796B', bg: '#E0F2F1' },
  tax:              { label: '세금 최적화',            icon: '💰', color: '#E65100', bg: '#FBE9E7' },
  'health-score':   { label: '포트폴리오 건강점수',   icon: '💊', color: '#AD1457', bg: '#FCE4EC' },
  discover:         { label: '종목 발굴',              icon: '🔍', color: '#1565C0', bg: '#E3F2FD' },
  'rebalance-plan': { label: '리밸런싱 실행 플랜',    icon: '📋', color: '#37474F', bg: '#ECEFF1' },
  'fx-timing':      { label: '환율 타이밍 분석',      icon: '💱', color: '#558B2F', bg: '#F1F8E9' },
};

function detectType(item: AiHistoryItem): AiReportType {
  const d = item.report_data as Record<string, unknown>;
  if (d._type) return d._type as AiReportType;
  if (Array.isArray(d.briefing)) return 'news';
  if (Array.isArray((d as unknown as AiImproveSection).improvements)) return 'improve';
  return 'analyze';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSummary(item: AiHistoryItem, type: AiReportType): string {
  const d = item.report_data as Record<string, unknown>;
  if (type === 'analyze' || type === 'improve') {
    return (d.summary as string) ?? '';
  }
  if (type === 'news') {
    const briefing = d.briefing as AiNewsItem[] | undefined;
    return (d.overview as string) ?? (briefing?.[0]?.summary ?? '');
  }
  return '';
}

// ── 펼친 상태의 상세 뷰 ─────────────────────────────────
function AnalyzeDetail({ data }: { data: AiReportSection }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailSectionTitle}>📊 포트폴리오 요약</Text>
      <Text style={styles.detailBody}>{data.summary}</Text>
      <Text style={[styles.detailSectionTitle, styles.mt8]}>💡 주요 인사이트</Text>
      {data.insights?.map((ins, i) => (
        <Text key={i} style={styles.detailBullet}>• {ins}</Text>
      ))}
      <Text style={[styles.detailSectionTitle, styles.mt8, styles.riskTitle]}>⚠️ 리스크</Text>
      {data.risks?.map((r, i) => (
        <Text key={i} style={[styles.detailBullet, styles.riskText]}>• {r}</Text>
      ))}
      <Text style={[styles.detailSectionTitle, styles.mt8, styles.recommendTitle]}>🎯 종합 추천</Text>
      <Text style={styles.detailBody}>{data.recommendation}</Text>
    </View>
  );
}

function ImproveDetail({ data }: { data: AiImproveSection }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailSectionTitle}>📋 현황 평가</Text>
      <Text style={styles.detailBody}>{data.summary}</Text>
      <Text style={[styles.detailSectionTitle, styles.mt8]}>🎯 개선 방향</Text>
      {data.improvements?.map((item, i) => (
        <View key={i} style={styles.improveItem}>
          <View style={[
            styles.priorityBadge,
            item.priority === 'high' ? styles.pHigh : item.priority === 'medium' ? styles.pMed : styles.pLow,
          ]}>
            <Text style={styles.priorityText}>
              {item.priority === 'high' ? '긴급' : item.priority === 'medium' ? '보통' : '권장'}
            </Text>
          </View>
          <Text style={styles.improveTitle}>{item.title}</Text>
          <Text style={styles.improveDesc}>{item.description}</Text>
        </View>
      ))}
      <Text style={[styles.detailSectionTitle, styles.mt8]}>⚖️ 리밸런싱</Text>
      <Text style={styles.detailBody}>{data.rebalancing}</Text>
    </View>
  );
}

function NewsDetail({ data }: { data: { briefing: AiNewsItem[]; overview: string } }) {
  const sentimentIcon = (s: string) => s === 'positive' ? '📈' : s === 'negative' ? '📉' : '➡️';
  const sentimentColor = (s: string) =>
    s === 'positive' ? '#E53935' : s === 'negative' ? '#1565C0' : '#5F6368';

  return (
    <View style={styles.detail}>
      <Text style={styles.detailSectionTitle}>🌐 시장 분위기</Text>
      <Text style={styles.detailBody}>{data.overview}</Text>
      {data.briefing?.map((item, i) => (
        <View key={i} style={styles.newsCard}>
          <View style={styles.newsHeader}>
            <Text style={styles.newsIcon}>{sentimentIcon(item.sentiment)}</Text>
            <View style={styles.newsInfo}>
              <Text style={styles.newsName}>{item.name}</Text>
              <Text style={[styles.newsSentiment, { color: sentimentColor(item.sentiment) }]}>
                {item.sentiment === 'positive' ? '긍정적' : item.sentiment === 'negative' ? '부정적' : '중립'}
              </Text>
            </View>
          </View>
          <Text style={styles.newsSummary}>{item.summary}</Text>
          {item.headlines?.length > 0 && (
            <View style={styles.headlines}>
              {item.headlines.map((h, j) => (
                <Text key={j} style={styles.headline} numberOfLines={2}>· {h}</Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export default function AiHistoryScreen() {
  const { data, isLoading } = useAiHistory();
  const [expanded, setExpanded] = useState<Set<ExpandedKey>>(new Set());

  const history = data?.history ?? [];

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="AI 분석 히스토리" modal />
        <LoadingSpinner message="불러오는 중..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="AI 분석 히스토리" modal />
      <ScrollView contentContainerStyle={styles.content}>
        {history.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>분석 기록이 없습니다</Text>
            <Text style={styles.emptyDesc}>AI 분석, 개선 제안, 뉴스 브리핑을 실행하면 여기에 기록됩니다.</Text>
          </View>
        )}

        {history.map((item) => {
          const type = detectType(item);
          const meta = TYPE_META[type];
          const isOpen = expanded.has(item.id);
          const summary = getSummary(item, type);
          const d = item.report_data as Record<string, unknown>;

          return (
            <View key={item.id} style={styles.card}>
              {/* 헤더 */}
              <Pressable style={styles.cardHeader} onPress={() => toggleExpand(item.id)}>
                <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                  <Text style={styles.typeBadgeIcon}>{meta.icon}</Text>
                  <Text style={[styles.typeBadgeLabel, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                  <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>›</Text>
                </View>
              </Pressable>

              {/* 요약 미리보기 */}
              {!isOpen && summary ? (
                <Text style={styles.cardPreview} numberOfLines={2}>{summary}</Text>
              ) : null}

              {/* 펼침 상세 */}
              {isOpen && (
                <>
                  {type === 'analyze' && <AnalyzeDetail data={d as unknown as AiReportSection} />}
                  {type === 'improve' && <ImproveDetail data={d as unknown as AiImproveSection} />}
                  {type === 'news' && <NewsDetail data={d as unknown as { briefing: AiNewsItem[]; overview: string }} />}
                  {(type === 'chat' || type === 'tax' || type === 'health-score' || type === 'discover' || type === 'rebalance-plan' || type === 'fx-timing') && (
                    <Text style={styles.genericDetail}>{(d as Record<string, unknown>).summary as string ?? '상세 내역은 각 AI 화면에서 확인하세요.'}</Text>
                  )}
                </>
              )}
            </View>
          );
        })}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, gap: 12 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  emptyDesc: { fontSize: 13, color: '#9AA0A6', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typeBadgeIcon: { fontSize: 14 },
  typeBadgeLabel: { fontSize: 12, fontWeight: '700' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDate: { fontSize: 11, color: '#9AA0A6' },
  chevron: { fontSize: 18, color: '#9AA0A6', transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  genericDetail: {
    fontSize: 13,
    color: '#5F6368',
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  cardPreview: {
    fontSize: 13,
    color: '#5F6368',
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  detail: { padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: '#F1F3F4' },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  detailBody: { fontSize: 13, color: '#3C4043', lineHeight: 20 },
  detailBullet: { fontSize: 13, color: '#3C4043', lineHeight: 20, paddingLeft: 4 },
  mt8: { marginTop: 8 },
  riskTitle: { color: '#C62828' },
  riskText: { color: '#C62828' },
  recommendTitle: { color: '#2E7D32' },

  improveItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#E8EAED',
    paddingLeft: 10,
    gap: 3,
    marginTop: 6,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pHigh: { backgroundColor: '#FEECEC' },
  pMed: { backgroundColor: '#FFF8E1' },
  pLow: { backgroundColor: '#E8F5E9' },
  priorityText: { fontSize: 10, fontWeight: '700', color: '#1A1A1A' },
  improveTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  improveDesc: { fontSize: 12, color: '#3C4043', lineHeight: 18 },

  newsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginTop: 6,
  },
  newsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newsIcon: { fontSize: 20 },
  newsInfo: { flex: 1 },
  newsName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  newsSentiment: { fontSize: 11, fontWeight: '600' },
  newsSummary: { fontSize: 12, color: '#3C4043', lineHeight: 18 },
  headlines: { gap: 3, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#E8EAED' },
  headline: { fontSize: 11, color: '#5F6368', lineHeight: 16 },

  bottomPad: { height: 20 },
});
