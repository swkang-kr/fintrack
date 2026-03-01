export default ({ config }) => ({
  ...config,
  plugins: [
    'expo-router',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: '포트폴리오 스크린샷을 읽기 위해 사진 라이브러리에 접근합니다.',
        cameraPermission: '포트폴리오 스크린샷을 촬영하기 위해 카메라에 접근합니다.',
      },
    ],
  ],
});
