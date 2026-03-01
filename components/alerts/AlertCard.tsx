import React from 'react';
import { Alert as RNAlert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  Alert,
  formatAlertTarget,
  formatAlertThreshold,
  formatCondition,
} from '@/types/alerts';

interface Props {
  alert: Alert;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export function AlertCard({ alert, onToggle, onDelete }: Props) {
  const target = formatAlertTarget(alert);
  const threshold = formatAlertThreshold(alert);
  const condition = formatCondition(alert.condition);
  const typeLabel = alert.type === 'exchange_rate' ? '환율' : '주가';
  const typeIcon = alert.type === 'exchange_rate' ? '💱' : '📈';

  function handleDelete() {
    RNAlert.alert('알림 삭제', `${target} ${condition} ${threshold} 알림을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(alert.id) },
    ]);
  }

  const lastTriggered = alert.triggered_at
    ? `마지막 발송: ${new Date(alert.triggered_at).toLocaleDateString('ko-KR')}`
    : '아직 발송 없음';

  return (
    <View style={[styles.card, !alert.is_active && styles.cardInactive]}>
      {/* 좌측: 아이콘 + 내용 */}
      <View style={styles.left}>
        <View style={styles.topRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeIcon} {typeLabel}</Text>
          </View>
          {alert.triggered_at && (
            <View style={styles.triggeredBadge}>
              <Text style={styles.triggeredBadgeText}>발송됨</Text>
            </View>
          )}
        </View>

        <Text style={styles.mainText}>
          <Text style={styles.targetText}>{target}</Text>
          {'  '}
          <Text style={styles.conditionText}>{condition}</Text>
          {'  '}
          <Text style={styles.thresholdText}>{threshold}</Text>
        </Text>

        <Text style={styles.lastTriggered}>{lastTriggered}</Text>
      </View>

      {/* 우측: 토글 + 삭제 */}
      <View style={styles.right}>
        <Switch
          value={alert.is_active}
          onValueChange={(v) => onToggle(alert.id, v)}
          trackColor={{ false: '#E8EAED', true: '#BDD7FB' }}
          thumbColor={alert.is_active ? '#1A73E8' : '#9AA0A6'}
        />
        <Pressable style={styles.deleteBtn} onPress={handleDelete} hitSlop={8}>
          <Text style={styles.deleteBtnText}>삭제</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInactive: {
    opacity: 0.55,
  },
  left: {
    flex: 1,
    gap: 6,
    marginRight: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#1A73E8',
    fontWeight: '700',
  },
  triggeredBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triggeredBadgeText: {
    fontSize: 11,
    color: '#34A853',
    fontWeight: '700',
  },
  mainText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  targetText: {
    fontWeight: '800',
  },
  conditionText: {
    color: '#5F6368',
    fontWeight: '600',
  },
  thresholdText: {
    fontWeight: '700',
    color: '#1A73E8',
  },
  lastTriggered: {
    fontSize: 11,
    color: '#9AA0A6',
  },
  right: {
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBCCC8',
    backgroundColor: '#FEF3F2',
  },
  deleteBtnText: {
    fontSize: 11,
    color: '#E53935',
    fontWeight: '600',
  },
});
