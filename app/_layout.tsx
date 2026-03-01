import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import mobileAds from 'react-native-google-mobile-ads';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePortfolioStore } from '@/stores/portfolioStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // 웹에서는 null 반환하지 않음
  // → null 반환 시 Stack이 마운트되지 않아 LinkingContext 미발견 오류 발생
  if (!loaded && Platform.OS !== 'web') return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { setSession, setInitialized } = useAuthStore();
  const { loadFromStorage } = usePortfolioStore();

  // AdMob 초기화 (광고 로드 전 반드시 필요)
  useEffect(() => {
    mobileAds()
      .setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR', 'AB4B1A4037B88C7B67AD050A13959DE4'],
      })
      .then(() => mobileAds().initialize())
      .catch(() => {});
  }, []);

  // 앱 시작 시 AsyncStorage에서 포트폴리오 상태 복원
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Supabase 인증 상태 리스너
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setInitialized(true);
        queryClient.invalidateQueries({ queryKey: ['portfolios'] });
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        queryClient.invalidateQueries({ queryKey: ['holdings'] });
        queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, setInitialized]);

  // OAuth 딥링크 폴백: Android에서 fintrack:// 로 redirect 될 때 세션 교환
  useEffect(() => {
    // 앱이 이미 열린 상태에서 딥링크로 들어올 때
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleOAuthUrl(url);
    });

    // 앱이 종료 상태에서 딥링크로 열릴 때
    Linking.getInitialURL().then((url) => {
      if (url) handleOAuthUrl(url);
    });

    return () => sub.remove();
  }, []);

  async function handleOAuthUrl(url: string) {
    // fintrack:// OAuth 콜백 처리 (code= 파라미터가 있을 때만)
    const codeMatch = url.match(/[?&]code=([^&#]+)/);
    if (!codeMatch || !url.startsWith('fintrack:')) return;
    try {
      await supabase.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1]));
    } catch {
      // 이미 사용된 code — 무시
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="holdings/add" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="holdings/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="alerts/add" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="watchlist/add" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="ai/history" options={{ headerShown: false }} />
          <Stack.Screen name="ai/chat" options={{ headerShown: false }} />
          <Stack.Screen name="ai/tax" options={{ headerShown: false }} />
          <Stack.Screen name="ai/health-score" options={{ headerShown: false }} />
          <Stack.Screen name="ai/discover" options={{ headerShown: false }} />
          <Stack.Screen name="ai/rebalance-plan" options={{ headerShown: false }} />
          <Stack.Screen name="ai/fx-timing" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
