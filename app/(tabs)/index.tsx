import React, { useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { RateList } from '@/components/exchange/RateList';
import { RateChart } from '@/components/exchange/RateChart';
import { CurrencyCalculator } from '@/components/exchange/CurrencyCalculator';
import { MarketIndices } from '@/components/exchange/MarketIndices';
import { BannerAdBottom } from '@/components/ads/BannerAd';
import { useAuth } from '@/hooks/useAuth';
import { useHoldingsWithPnL } from '@/hooks/usePortfolio';
import { useAlerts } from '@/hooks/useAlerts';
import { CurrencyCode } from '@/services/exchangeApi';
import { formatAlertTarget, formatAlertThreshold, formatCondition } from '@/types/alerts';

export default function ExchangeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  // 로그인 시 미니 포트폴리오 표시
  const { holdings, summary } = useHoldingsWithPnL();
  const showMiniPortfolio = !!user && holdings.length > 0;

  // 환율 알림 요약 (활성 + 환율 타입만)
  const { data: alerts = [] } = useAlerts();
  const activeExchangeAlerts = alerts.filter(
    (a) => a.is_active && a.type === 'exchange_rate'
  );

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FinTrack</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerDate}>{today}</Text>
          <Pressable
            style={styles.bellBtn}
            onPress={() => router.push('/(tabs)/alerts')}
            hitSlop={10}
          >
            <FontAwesome name="bell-o" size={18} color="#5F6368" />
            {activeExchangeAlerts.length > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{activeExchangeAlerts.length}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 미니 포트폴리오 (로그인 + 종목 있을 때) ── */}
        {showMiniPortfolio && (
          <Pressable
            style={styles.miniPortfolio}
            onPress={() => router.push('/(tabs)/portfolio')}
          >
            <View style={styles.miniPortfolioLeft}>
              <Text style={styles.miniPortfolioLabel}>내 포트폴리오 총자산</Text>
              <Text style={styles.miniPortfolioValue}>
                ₩{Math.round(summary.totalValue).toLocaleString('ko-KR')}
              </Text>
            </View>
            <View style={styles.miniPortfolioRight}>
              <Text
                style={[
                  styles.miniPortfolioPnl,
                  summary.totalPnl >= 0 ? styles.up : styles.down,
                ]}
              >
                {summary.totalPnl >= 0 ? '▲ +' : '▼ '}
                {summary.totalPnlPercent.toFixed(2)}%
              </Text>
              <Text style={styles.miniPortfolioLink}>자세히 →</Text>
            </View>
          </Pressable>
        )}

        {/* ── 시장 지수 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>시장 지수</Text>
        </View>
        <MarketIndices />

        {/* ── 환율 섹션 ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>오늘의 환율</Text>
            <Text style={styles.sectionSub}>탭해서 차트 보기</Text>
          </View>
        </View>

        <RateList
          selectedCurrency={selectedCurrency}
          onSelect={setSelectedCurrency}
        />

        {/* ── 차트 섹션 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCurrency}/KRW 30일 추이
          </Text>
        </View>

        <RateChart currency={selectedCurrency} />

        {/* ── 내 환율 알림 요약 ── */}
        {user && activeExchangeAlerts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>내 환율 알림</Text>
              <Pressable onPress={() => router.push('/(tabs)/alerts')}>
                <Text style={styles.sectionLink}>전체 보기</Text>
              </Pressable>
            </View>
            <View style={styles.alertsRow}>
              {activeExchangeAlerts.slice(0, 3).map((alert) => (
                <View key={alert.id} style={styles.alertChip}>
                  <Text style={styles.alertChipTarget}>
                    {formatAlertTarget(alert)}
                  </Text>
                  <Text style={styles.alertChipCondition}>
                    {formatCondition(alert.condition)} {formatAlertThreshold(alert)}
                  </Text>
                </View>
              ))}
              {activeExchangeAlerts.length > 3 && (
                <Pressable
                  style={[styles.alertChip, styles.alertChipMore]}
                  onPress={() => router.push('/(tabs)/alerts')}
                >
                  <Text style={styles.alertChipMoreText}>
                    +{activeExchangeAlerts.length - 3}개 더
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* ── 환율 계산기 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>환율 계산기</Text>
        </View>

        <CurrencyCalculator />

        <View style={styles.bottomPad} />
      </ScrollView>

      <BannerAdBottom />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A73E8',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerDate: { fontSize: 13, color: '#9AA0A6' },
  bellBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  // 미니 포트폴리오
  miniPortfolio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A73E8',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  miniPortfolioLeft: { gap: 2 },
  miniPortfolioLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  miniPortfolioValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  miniPortfolioRight: { alignItems: 'flex-end', gap: 4 },
  miniPortfolioPnl: { fontSize: 15, fontWeight: '700' },
  miniPortfolioLink: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  up: { color: '#FFD740' },   // 파란 배경 위에서 노란색이 더 잘 보임
  down: { color: '#FF8A80' }, // 파란 배경 위에서 연한 빨간색

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  sectionSub: { fontSize: 12, color: '#9AA0A6' },
  sectionLink: { fontSize: 12, color: '#1A73E8', fontWeight: '600' },

  // 환율 알림 요약
  alertsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  alertChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  alertChipTarget: { fontSize: 11, color: '#5F6368', fontWeight: '600' },
  alertChipCondition: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  alertChipMore: {
    backgroundColor: '#F1F3F4',
    borderColor: '#E8EAED',
    justifyContent: 'center',
  },
  alertChipMoreText: { fontSize: 12, color: '#5F6368', fontWeight: '600' },

  bottomPad: { height: 20 },
});
