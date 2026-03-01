import { supabase } from '@/lib/supabase';
import { Alert, AlertInput } from '@/types/alerts';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

// ── 알림 CRUD (Supabase Direct) ──────────────────────────

export async function getAlerts(): Promise<Alert[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Alert[];
}

export async function addAlert(input: AlertInput): Promise<Alert> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다.');

  const { data, error } = await supabase
    .from('alerts')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Alert;
}

export async function toggleAlert(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAlert(id: string): Promise<void> {
  const { error } = await supabase.from('alerts').delete().eq('id', id);
  if (error) throw error;
}

// ── Push Token 등록 (Backend API) ───────────────────────

export async function registerPushToken(
  expoPushToken: string,
  platform: 'ios' | 'android'
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await fetch(`${API_BASE}/api/alerts/register-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ token: expoPushToken, platform }),
  });
}
