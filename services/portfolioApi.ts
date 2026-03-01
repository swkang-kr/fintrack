import { supabase } from '@/lib/supabase';
import { Holding, HoldingInput, Portfolio, PortfolioSnapshot } from '@/types/portfolio';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/** 사용자의 모든 포트폴리오 조회 */
export async function getPortfolios(userId: string): Promise<Portfolio[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Portfolio[];
}

/** 포트폴리오 생성 */
export async function createPortfolio(userId: string, name: string): Promise<Portfolio> {
  const { data, error } = await supabase
    .from('portfolios')
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data as Portfolio;
}

/** 포트폴리오 이름 변경 */
export async function renamePortfolio(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('portfolios').update({ name }).eq('id', id);
  if (error) throw error;
}

/** 포트폴리오 삭제 (holdings CASCADE) */
export async function deletePortfolio(id: string): Promise<void> {
  const { error } = await supabase.from('portfolios').delete().eq('id', id);
  if (error) throw error;
}

/** 기본 포트폴리오 조회 or 생성 */
export async function getOrCreatePortfolio(userId: string): Promise<Portfolio> {
  const { data: existing, error: fetchErr } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (existing) return existing as Portfolio;
  if (fetchErr?.code !== 'PGRST116') throw fetchErr; // 'not found' 이외 에러

  const { data: created, error: createErr } = await supabase
    .from('portfolios')
    .insert({ user_id: userId, name: '내 포트폴리오' })
    .select()
    .single();

  if (createErr) throw createErr;
  return created as Portfolio;
}

/** 포트폴리오의 종목 목록 조회 */
export async function getHoldings(portfolioId: string): Promise<Holding[]> {
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Holding[];
}

/** 종목 추가 */
export async function addHolding(
  userId: string,
  input: HoldingInput
): Promise<Holding> {
  const { data, error } = await supabase
    .from('holdings')
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as Holding;
}

/** 종목 수정 (수량·평균단가) */
export async function updateHolding(
  id: string,
  updates: Pick<Holding, 'quantity' | 'avg_price'>
): Promise<Holding> {
  const { data, error } = await supabase
    .from('holdings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Holding;
}

/** 종목 삭제 */
export async function deleteHolding(id: string): Promise<void> {
  const { error } = await supabase.from('holdings').delete().eq('id', id);
  if (error) throw error;
}

/** 포트폴리오 히스토리 스냅샷 조회 */
export async function fetchPortfolioHistory(
  portfolioId: string,
  range: string
): Promise<PortfolioSnapshot[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');

  const res = await fetch(
    `${API_BASE}/api/portfolio/history?portfolioId=${encodeURIComponent(portfolioId)}&range=${range}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } }
  );
  if (!res.ok) throw new Error('히스토리 조회 실패');
  const data = await res.json();
  return data.snapshots as PortfolioSnapshot[];
}
