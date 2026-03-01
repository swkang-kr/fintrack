import React from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { HoldingList } from '@/components/portfolio/HoldingList';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { BenchmarkComparison } from '@/components/portfolio/BenchmarkComparison';
import { DividendCalendar } from '@/components/portfolio/DividendCalendar';
import { PortfolioHistoryChart } from '@/components/portfolio/PortfolioHistoryChart';
import { PortfolioSwitcher } from '@/components/portfolio/PortfolioSwitcher';
import { WatchlistCard } from '@/components/watchlist/WatchlistCard';
import { BannerAdBottom } from '@/components/ads/BannerAd';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import {
  useHoldingsWithPnL,
  usePortfolios,
  useCreatePortfolio,
  useDeletePortfolio,
} from '@/hooks/usePortfolio';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useWatchlistWithQuotes, useRemoveWatchlist } from '@/hooks/useWatchlist';
import { WatchlistWithQuote } from '@/hooks/useWatchlist';
import { exportPortfolioCSV } from '@/hooks/useExport';

export default function PortfolioScreen() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const { holdings, summary, isLoading, isError, isFetching, refetch } = useHoldingsWithPnL();
  const { data: portfolios = [] } = usePortfolios();
  const { selectedPortfolioId, setSelectedPortfolioId } = usePortfolioStore();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const { items: watchlist, isLoading: isLoadingWatchlist } = useWatchlistWithQuotes();
  const removeWatchlist = useRemoveWatchlist();

  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId) ?? portfolios[0];

  // ── 미인증 ────────────────────────────────────────────
  if (!initialized) {
    return <LoadingSpinner message="초기화 중..." />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="포트폴리오를 관리하려면 로그인해주세요."
          actionLabel="로그인 / 회원가입"
          onAction={() => router.push('/auth/login')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  // ── 로딩 ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>포트폴리오</Text>
        </View>
        <LoadingSpinner message="불러오는 중..." />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  // ── 에러 ─────────────────────────────────────────────
  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>포트폴리오</Text>
        </View>
        <EmptyState
          icon="⚠️"
          title="데이터 로드 실패"
          description="네트워크 연결을 확인하고 다시 시도해주세요."
          actionLabel="새로고침"
          onAction={refetch}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  // ── 포트폴리오 공유 ───────────────────────────────────
  async function handleShare() {
    if (holdings.length === 0) return;
    const topHoldings = holdings
      .slice(0, 5)
      .map((h) => {
        const pnl = h.pnlPercent >= 0 ? `▲ +${h.pnlPercent.toFixed(2)}%` : `▼ ${h.pnlPercent.toFixed(2)}%`;
        return `  ${h.name}: ${pnl}`;
      })
      .join('\n');

    const totalPnlStr =
      summary.totalPnl >= 0
        ? `▲ +₩${Math.round(summary.totalPnl).toLocaleString('ko-KR')} (+${summary.totalPnlPercent.toFixed(2)}%)`
        : `▼ -₩${Math.round(Math.abs(summary.totalPnl)).toLocaleString('ko-KR')} (${summary.totalPnlPercent.toFixed(2)}%)`;

    const message =
      `📊 내 포트폴리오 현황\n` +
      `총 평가금액: ₩${Math.round(summary.totalValue).toLocaleString('ko-KR')}\n` +
      `평가손익: ${totalPnlStr}\n\n` +
      `📈 보유 종목\n` +
      topHoldings +
      (holdings.length > 5 ? `\n  외 ${holdings.length - 5}개` : '') +
      `\n\nFinTrack으로 관리 중 📱`;

    try {
      await Share.share({ message, title: 'FinTrack 포트폴리오' });
    } catch {
      // user cancelled
    }
  }

  // ── CSV 내보내기 ──────────────────────────────────────
  async function handleExport() {
    try {
      await exportPortfolioCSV(holdings, summary, selectedPortfolio?.name ?? '내 포트폴리오');
    } catch {
      Alert.alert('내보내기 실패', '다시 시도해주세요.');
    }
  }

  // ── 관심종목 ──────────────────────────────────────────
  function handleWatchlistDelete(id: string) {
    removeWatchlist.mutate(id);
  }

  function handleAddToPortfolio(item: WatchlistWithQuote) {
    router.push({
      pathname: '/holdings/add',
      params: {
        prefillTicker: item.ticker,
        prefillName: item.name,
        prefillMarket: item.market,
        prefillCurrency: item.currency,
      },
    });
  }

  const WatchlistSection =
    !isLoadingWatchlist && watchlist.length > 0 ? (
      <View style={styles.watchlistSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>관심종목 ({watchlist.length})</Text>
          <Pressable onPress={() => router.push('/watchlist/add')}>
            <Text style={styles.addLink}>+ 추가</Text>
          </Pressable>
        </View>
        {watchlist.map((item) => (
          <WatchlistCard
            key={item.id}
            item={item}
            onDelete={handleWatchlistDelete}
            onAddToPortfolio={handleAddToPortfolio}
          />
        ))}
      </View>
    ) : (
      <View style={styles.watchlistSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>관심종목</Text>
          <Pressable onPress={() => router.push('/watchlist/add')}>
            <Text style={styles.addLink}>+ 추가</Text>
          </Pressable>
        </View>
        <View style={styles.watchlistEmpty}>
          <Text style={styles.watchlistEmptyText}>
            관심 있는 종목을 추가해 가격 변동을 확인하세요.
          </Text>
        </View>
      </View>
    );

  // ── 정상 ─────────────────────────────────────────────
  const Header = (
    <View>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>포트폴리오</Text>
          <PortfolioSwitcher
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
            onSelect={setSelectedPortfolioId}
            onCreate={(name) => createPortfolio.mutate(name)}
            onDelete={(id) => deletePortfolio.mutate(id)}
          />
        </View>
        <View style={styles.headerActions}>
          {holdings.length > 0 && (
            <Pressable style={styles.iconBtn} onPress={handleShare}>
              <FontAwesome name="share-alt" size={15} color="#1A73E8" />
            </Pressable>
          )}
          {holdings.length > 0 && (
            <Pressable style={styles.iconBtn} onPress={handleExport}>
              <FontAwesome name="download" size={15} color="#34A853" />
            </Pressable>
          )}
          <Pressable
            style={styles.scanBtn}
            onPress={() => router.push('/holdings/scan')}
          >
            <FontAwesome name="camera" size={13} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={() => router.push('/holdings/add')}
          >
            <Text style={styles.addBtnText}>+ 추가</Text>
          </Pressable>
        </View>
      </View>

      {/* 요약 카드 */}
      <PortfolioSummary summary={summary} isFetching={isFetching} holdings={holdings} />

      {/* 자산 성장 히스토리 차트 */}
      {holdings.length > 0 && (
        <PortfolioHistoryChart
          portfolioId={selectedPortfolio?.id}
          currentValue={summary.totalValue}
          totalCost={summary.totalCost}
        />
      )}

      {/* 자산 배분 차트 */}
      {holdings.length >= 2 && <AllocationChart holdings={holdings} />}

      {/* 보유 종목 섹션 제목 */}
      {holdings.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>보유 종목 ({holdings.length})</Text>
        </View>
      )}
    </View>
  );

  const Footer = (
    <View>
      {holdings.length === 0 && (
        <View style={styles.holdingsEmpty}>
          <Text style={styles.holdingsEmptyText}>
            + 추가 버튼을 눌러 보유 종목을 등록하세요.
          </Text>
          <Pressable
            style={styles.holdingsEmptyBtn}
            onPress={() => router.push('/holdings/add')}
          >
            <Text style={styles.holdingsEmptyBtnText}>종목 추가하기</Text>
          </Pressable>
        </View>
      )}

      {/* 벤치마크 비교 */}
      {holdings.length > 0 && (
        <View style={styles.premiumSection}>
          <Text style={styles.sectionTitle2}>오늘 수익률 비교</Text>
          <BenchmarkComparison summary={summary} holdings={holdings} />
        </View>
      )}

      {/* 배당 캘린더 */}
      <View style={styles.premiumSection}>
        <Text style={styles.sectionTitle2}>배당 캘린더</Text>
        <DividendCalendar holdings={holdings} />
      </View>

      {WatchlistSection}
      <View style={styles.bottomPad} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <HoldingList
        holdings={holdings}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
      />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#34A853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: '#1A73E8',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#5F6368' },
  sectionTitle2: {
    fontSize: 14, fontWeight: '600', color: '#5F6368',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6,
  },
  addLink: { fontSize: 13, color: '#1A73E8', fontWeight: '600' },
  // 보유 종목 없음
  holdingsEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  holdingsEmptyText: {
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    marginBottom: 12,
  },
  holdingsEmptyBtn: {
    backgroundColor: '#1A73E8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  holdingsEmptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  premiumSection: { marginBottom: 4 },
  // 관심종목
  watchlistSection: { marginTop: 8 },
  watchlistEmpty: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  watchlistEmptyText: {
    fontSize: 13,
    color: '#9AA0A6',
    textAlign: 'center',
  },
  bottomPad: { height: 16 },
});
