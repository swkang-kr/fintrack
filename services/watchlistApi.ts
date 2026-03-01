import { supabase } from '@/lib/supabase';

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  market: string;
  currency: string;
}

export interface WatchlistInput {
  ticker: string;
  name: string;
  market: string;
  currency: string;
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('id, ticker, name, market, currency')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addToWatchlist(input: WatchlistInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { error } = await supabase.from('watchlist').insert({
    user_id: user.id,
    ...input,
  });
  if (error) throw error;
}

export async function removeFromWatchlist(id: string): Promise<void> {
  const { error } = await supabase.from('watchlist').delete().eq('id', id);
  if (error) throw error;
}
