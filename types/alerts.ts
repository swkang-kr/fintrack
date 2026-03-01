export type AlertType = 'exchange_rate' | 'stock_price';
export type AlertCondition = 'above' | 'below';

export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  target: string;        // 'USD/KRW' | 'AAPL' | '005930.KS'
  condition: AlertCondition;
  threshold: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface AlertInput {
  type: AlertType;
  target: string;
  condition: AlertCondition;
  threshold: number;
}

// 화면 표시용 레이블 유틸
export const EXCHANGE_TARGETS = [
  { label: 'USD/KRW (달러)', value: 'USD/KRW', currency: 'KRW' },
  { label: 'EUR/KRW (유로)', value: 'EUR/KRW', currency: 'KRW' },
  { label: 'JPY/KRW (엔화)', value: 'JPY/KRW', currency: 'KRW' },
  { label: 'CNY/KRW (위안)', value: 'CNY/KRW', currency: 'KRW' },
] as const;

export function formatAlertTarget(alert: Alert): string {
  if (alert.type === 'exchange_rate') return alert.target;
  return alert.target.replace(/\.(KS|KQ)$/, '');
}

export function formatAlertThreshold(alert: Alert): string {
  const val = alert.threshold;
  if (alert.type === 'exchange_rate') {
    const currency = alert.target.split('/')[0];
    if (currency === 'JPY') return `₩${val.toFixed(4)}`;
    return `₩${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
  // 주식: KRW vs USD 판단 (한국: .KS/.KQ)
  if (alert.target.endsWith('.KS') || alert.target.endsWith('.KQ')) {
    return `₩${Math.round(val).toLocaleString('ko-KR')}`;
  }
  return `$${val.toFixed(2)}`;
}

export function formatCondition(condition: AlertCondition): string {
  return condition === 'above' ? '이상' : '이하';
}
