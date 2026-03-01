/**
 * RewardedAd component - 광고 시청 후 AI 크레딧 +3회 지급
 *
 * EAS Build + AdMob 설정 완료 후 실제 연동:
 * 1. app.json에 react-native-google-mobile-ads 플러그인 설정
 * 2. .env.local에 EXPO_PUBLIC_ADMOB_REWARDED_ANDROID, EXPO_PUBLIC_ADMOB_REWARDED_IOS 설정
 * 3. AD_UNIT_ID를 아래 주석 코드로 교체:
 *    const AD_UNIT_ID = __DEV__
 *      ? TestIds.REWARDED
 *      : Platform.OS === 'ios'
 *        ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS!
 *        : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID!;
 *
 * 현재는 개발용 TestIds.REWARDED 사용 (항상 TestIds.REWARDED)
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { claimRewardCredit } from '@/services/aiApi';

// 구글 공식 테스트 ID (개발용)
const TEST_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';

// TODO: EAS Build 배포 시 실제 광고 단위 ID로 교체
// const AD_UNIT_ID = Platform.OS === 'ios'
//   ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS!
//   : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID!;
const AD_UNIT_ID = Platform.OS === 'ios' ? TEST_ID_IOS : TEST_ID_ANDROID;

interface Props {
  onRewarded: () => void;
  disabled?: boolean;
}

export function RewardedAdButton({ onRewarded, disabled = false }: Props) {
  const rewardedRef = useRef<RewardedAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function loadAd() {
    setIsLoaded(false);
    setLoadFailed(false);

    const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsLoaded(true);
      setLoadFailed(false);
    });

    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
      setIsLoaded(false);
      setLoadFailed(true);
      // 30초 후 자동 재시도
      retryTimerRef.current = setTimeout(() => loadAd(), 30_000);
    });

    const unsubEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        setIsShowing(false);
        try {
          const result = await claimRewardCredit();
          Alert.alert('크레딧 지급', result.message);
          onRewarded();
        } catch (err) {
          Alert.alert(
            '크레딧 지급 오류',
            err instanceof Error ? err.message : '크레딧 지급에 실패했습니다.'
          );
        }
        loadAd();
      }
    );

    rewarded.load();
    rewardedRef.current = rewarded;

    return () => {
      unsubLoaded();
      unsubError();
      unsubEarned();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }

  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePress() {
    if (!isLoaded || !rewardedRef.current || isShowing) return;
    setIsShowing(true);
    rewardedRef.current.show().catch(() => setIsShowing(false));
  }

  function handleRetry() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    loadAd();
  }

  if (disabled) {
    return (
      <Pressable style={[styles.btn, styles.btnDisabled]} disabled>
        <Text style={styles.btnTextDisabled}>최대 보상 달성 (15회/일)</Text>
      </Pressable>
    );
  }

  if (loadFailed) {
    return (
      <Pressable style={[styles.btn, styles.btnError]} onPress={handleRetry}>
        <Text style={styles.btnText}>광고 불러오기 실패 — 탭하여 재시도</Text>
      </Pressable>
    );
  }

  if (isShowing || !isLoaded) {
    return (
      <Pressable style={[styles.btn, styles.btnLoading]} disabled>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.btnText}>
          {isShowing ? '광고 시청 중...' : '광고 불러오는 중...'}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.btn} onPress={handlePress}>
      <Text style={styles.btnText}>광고 시청하고 +3회 획득</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#FF8F00',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnLoading: {
    backgroundColor: '#C5CACE',
  },
  btnDisabled: {
    backgroundColor: '#9AA0A6',
  },
  btnError: {
    backgroundColor: '#E53935',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  btnTextDisabled: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
