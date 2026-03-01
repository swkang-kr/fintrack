import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * SSR-safe storage adapter
 * - Native (iOS/Android): AsyncStorage
 * - Web 브라우저: localStorage
 * - Web SSR (window 없음): no-op (세션 없이 초기화, 클라이언트에서 복원됨)
 */
const storage =
  Platform.OS !== 'web'
    ? AsyncStorage
    : {
        getItem: async (key: string): Promise<string | null> => {
          if (typeof window === 'undefined') return null;
          return window.localStorage.getItem(key);
        },
        setItem: async (key: string, value: string): Promise<void> => {
          if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        },
        removeItem: async (key: string): Promise<void> => {
          if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        },
      };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'fintrack' },
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce', // OAuth PKCE 플로우 (네이티브 앱 권장)
  },
});
