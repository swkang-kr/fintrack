import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from './alertsApi';

/**
 * 포그라운드에서 알림 표시 설정
 * 앱이 열려 있어도 배너+소리로 알림 표시
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Android 알림 채널 설정 */
async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('fintrack-alerts', {
    name: '목표가 알림',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A73E8',
  });
}

/** 권한 요청 후 Expo Push Token 반환 */
export async function requestPermissionsAndGetToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[notifications] 실물 기기에서만 푸시 알림을 사용할 수 있습니다.');
    return null;
  }

  await setupAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;

  if (existingStatus !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    status = newStatus;
  }

  if (status !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/** 현재 알림 권한 상태 조회 */
export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * 로그인 후 Push Token을 백엔드에 등록
 * _layout.tsx 의 SIGNED_IN 이벤트에서 호출
 */
export async function registerTokenWithBackend(): Promise<void> {
  try {
    const token = await requestPermissionsAndGetToken();
    if (!token) return;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registerPushToken(token, platform);
  } catch (err) {
    console.error('[notifications] token 등록 실패:', err);
  }
}

/** 알림 응답 핸들러 구독 (탭해서 앱 열었을 때) */
export function subscribeToNotificationResponse(
  handler: (notification: Notifications.NotificationResponse) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  return () => sub.remove();
}
