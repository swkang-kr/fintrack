import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, signInWithKakao } = useAuth();

  const [loadingProvider, setLoadingProvider] = useState<'google' | 'kakao' | null>(null);

  async function handleGoogle() {
    setLoadingProvider('google');
    try {
      await signInWithGoogle();
      // Android: Linking 핸들러가 deep link를 처리할 시간을 줌
      await new Promise(r => setTimeout(r, 600));
      const { data: { session } } = await supabase.auth.getSession();
      if (session && router.canGoBack()) router.back();
      // session 없으면 = 사용자가 취소했거나 OAuth redirect 실패 → 로그인 화면 유지
    } catch (err: unknown) {
      Alert.alert('로그인 실패', err instanceof Error ? err.message : '구글 로그인에 실패했습니다.');
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleKakao() {
    setLoadingProvider('kakao');
    try {
      await signInWithKakao();
      await new Promise(r => setTimeout(r, 600));
      const { data: { session } } = await supabase.auth.getSession();
      if (session && router.canGoBack()) router.back();
    } catch (err: unknown) {
      Alert.alert('로그인 실패', err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.');
    } finally {
      setLoadingProvider(null);
    }
  }

  const isLoading = loadingProvider !== null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 닫기 버튼 */}
      <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
        <FontAwesome name="times" size={17} color="#5F6368" />
      </Pressable>

      <View style={styles.container}>
        {/* 로고 */}
        <View style={styles.header}>
          <Text style={styles.logo}>FinTrack</Text>
          <Text style={styles.subtitle}>환율·주식 포트폴리오 트래커</Text>
        </View>

        <Text style={styles.desc}>소셜 계정으로 간편하게 시작하세요</Text>

        {/* 구글 버튼 */}
        <Pressable
          style={[styles.socialBtn, styles.googleBtn, isLoading && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={isLoading}
        >
          <FontAwesome name="google" size={18} color="#EA4335" />
          <Text style={styles.googleText}>
            {loadingProvider === 'google' ? '로그인 중...' : 'Google로 계속하기'}
          </Text>
        </Pressable>

        {/* 카카오 버튼 */}
        <Pressable
          style={[styles.socialBtn, styles.kakaoBtn, isLoading && styles.btnDisabled]}
          onPress={handleKakao}
          disabled={isLoading}
        >
          {/* 카카오 아이콘 (말풍선 + K) */}
          <View style={styles.kakaoIcon}>
            <Text style={styles.kakaoIconText}>K</Text>
          </View>
          <Text style={styles.kakaoText}>
            {loadingProvider === 'kakao' ? '로그인 중...' : 'Kakao로 계속하기'}
          </Text>
        </Pressable>

        {/* 건너뛰기 */}
        <Pressable onPress={() => router.back()} style={styles.skipBtn}>
          <Text style={styles.skipText}>나중에 시작하기</Text>
        </Pressable>
      </View>

      {/* 안내 문구 */}
      <Text style={styles.notice}>
        로그인 시 포트폴리오 데이터가 클라우드에 동기화됩니다.{'\n'}
        비로그인 시 일부 기능이 제한됩니다.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  closeBtn: {
    alignSelf: 'flex-end',
    margin: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },

  header: { alignItems: 'center', marginBottom: 8 },
  logo: { fontSize: 38, fontWeight: '800', color: '#1A73E8', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#9AA0A6', marginTop: 6 },

  desc: {
    textAlign: 'center',
    fontSize: 15,
    color: '#5F6368',
    marginBottom: 8,
  },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnDisabled: { opacity: 0.6 },

  // 구글
  googleBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E8EAED',
  },
  googleText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

  // 카카오
  kakaoBtn: { backgroundColor: '#FEE500' },
  kakaoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3A1D1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoIconText: { fontSize: 13, fontWeight: '800', color: '#FEE500' },
  kakaoText: { fontSize: 15, fontWeight: '600', color: '#3A1D1D' },

  skipBtn: { alignItems: 'center', marginTop: 8 },
  skipText: { fontSize: 14, color: '#9AA0A6', textDecorationLine: 'underline' },

  notice: {
    textAlign: 'center',
    fontSize: 11,
    color: '#C5C5C5',
    paddingHorizontal: 24,
    paddingBottom: 24,
    lineHeight: 17,
  },
});
