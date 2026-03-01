import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// 웹 OAuth 콜백 완료 처리 (Expo web 필수)
WebBrowser.maybeCompleteAuthSession();

export function useAuth() {
  const { user, session, initialized } = useAuthStore();

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function signInWithGoogle() {
    return _signInWithOAuth('google');
  }

  async function signInWithKakao() {
    return _signInWithOAuth('kakao');
  }

  return { user, session, initialized, signIn, signUp, signOut, signInWithGoogle, signInWithKakao };
}

// ── Expo Go / 빌드앱 분기 redirect URL ────────────────────
function getRedirectUrl(): string {
  // Expo Go: debuggerHost가 있으면 exp:// 스킴 사용
  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `exp://${host}:8081/--/`;
  }
  // 네이티브 빌드: app.json의 scheme 값 사용
  // Supabase > Auth > URL Configuration > Redirect URLs 에 'fintrack://' 추가 필요
  return 'fintrack://';
}

// ── 내부: OAuth 공통 처리 ──────────────────────────────────
async function _signInWithOAuth(provider: 'google' | 'kakao') {
  const redirectTo = getRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) throw error ?? new Error('OAuth URL 생성 실패');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success') {
    return;
  }

  const url = result.url;

  // PKCE: ?code= 파라미터
  const codeMatch = url.match(/[?&]code=([^&#]+)/);
  if (codeMatch) {
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(
      decodeURIComponent(codeMatch[1])
    );
    if (codeError) throw codeError;
    return;
  }

  // Implicit fallback: #access_token=
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const hashParams = new URLSearchParams(hash);
  const access_token = hashParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token');
  if (access_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token ?? '',
    });
    if (sessionError) throw sessionError;
  }
}
