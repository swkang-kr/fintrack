import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AlertCard } from '@/components/alerts/AlertCard';
import { BannerAdBottom } from '@/components/ads/BannerAd';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useAlerts, useToggleAlert, useDeleteAlert } from '@/hooks/useAlerts';
import { requestPermissionsAndGetToken } from '@/services/notificationService';

export default function AlertsScreen() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const { data: alerts = [], isLoading, isError, refetch } = useAlerts();
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();

  const [permStatus, setPermStatus] = useState<string>('undetermined');

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => setPermStatus(status));
  }, []);

  async function handleRequestPermission() {
    const token = await requestPermissionsAndGetToken();
    const { status } = await Notifications.getPermissionsAsync();
    setPermStatus(status);
    if (token) router.push('/alerts/add');
  }

  // ── 미인증 ─────────────────────────────────────────────
  if (!initialized) return <LoadingSpinner message="초기화 중..." />;

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <EmptyState
          icon="🔔"
          title="로그인이 필요합니다"
          description="알림을 설정하려면 로그인해주세요."
          actionLabel="로그인 / 회원가입"
          onAction={() => router.push('/auth/login')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  // ── 알림 권한 배너 ─────────────────────────────────────
  const permissionBanner =
    permStatus !== 'granted' ? (
      <Pressable style={styles.permBanner} onPress={handleRequestPermission}>
        <Text style={styles.permBannerText}>
          🔕 알림 권한이 필요합니다. 탭하여 허용하기
        </Text>
      </Pressable>
    ) : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>목표가 알림</Text>
        </View>
        {permissionBanner}
        <LoadingSpinner message="불러오는 중..." />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>목표가 알림</Text>
        </View>
        <EmptyState
          icon="⚠️"
          title="데이터 로드 실패"
          actionLabel="새로고침"
          onAction={refetch}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  const Header = (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>목표가 알림</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() =>
            permStatus === 'granted'
              ? router.push('/alerts/add')
              : handleRequestPermission()
          }
        >
          <Text style={styles.addBtnText}>+ 추가</Text>
        </Pressable>
      </View>
      {permissionBanner}
      {alerts.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>설정된 알림 ({alerts.length})</Text>
          <Text style={styles.sectionHint}>24시간 쿨다운 적용</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {alerts.length === 0 ? (
        <>
          {Header}
          <EmptyState
            icon="🔔"
            title="설정된 알림이 없습니다"
            description="목표 환율·주가 도달 시 즉시 알림을 받아보세요."
            actionLabel="알림 추가하기"
            onAction={() =>
              permStatus === 'granted'
                ? router.push('/alerts/add')
                : handleRequestPermission()
            }
          />
        </>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AlertCard
              alert={item}
              onToggle={(id, isActive) => toggleAlert.mutate({ id, isActive })}
              onDelete={(id) => deleteAlert.mutate(id)}
            />
          )}
          ListHeaderComponent={Header}
          ListFooterComponent={<View style={styles.bottomPad} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  addBtn: {
    backgroundColor: '#1A73E8',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  permBanner: {
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  permBannerText: { fontSize: 13, color: '#F57F17', fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#5F6368' },
  sectionHint: { fontSize: 11, color: '#9AA0A6' },
  listContent: { paddingBottom: 8 },
  bottomPad: { height: 16 },
});
