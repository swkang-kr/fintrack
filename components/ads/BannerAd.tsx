import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID!
    : process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID!;

export const BANNER_HEIGHT = 50;

export function BannerAdBottom() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={UNIT_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
});
