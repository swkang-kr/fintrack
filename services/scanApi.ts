import { supabase } from '@/lib/supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface ScannedHolding {
  name: string;
  ticker: string;
  market: string;
  currency: string;
  quantity: number;
  avg_price: number;
}

export interface ScanResult {
  holdings: ScannedHolding[];
  message: string;
}

export async function scanPortfolioImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ScanResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증이 필요합니다.');

  const res = await fetch(`${API_BASE}/api/ai/scan-portfolio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? '이미지 분석에 실패했습니다.');
  }

  return res.json() as Promise<ScanResult>;
}
