import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads';

const UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE_ID!
    : process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE_ID!;

export function NativeAdCard() {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let ad: NativeAd | null = null;

    NativeAd.createForAdRequest(UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
      .then((loadedAd) => {
        ad = loadedAd;
        setNativeAd(loadedAd);
      })
      .catch(() => {
        // 광고 로드 실패 시 컴포넌트 숨김
      });

    return () => {
      ad?.destroy();
    };
  }, []);

  if (!nativeAd) return null;

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.header}>
        {nativeAd.icon?.url && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={styles.titleArea}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiser} numberOfLines={1}>
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          ) : null}
        </View>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>광고</Text>
        </View>
      </View>

      <NativeAsset assetType={NativeAssetType.BODY}>
        <Text style={styles.body} numberOfLines={2}>
          {nativeAd.body}
        </Text>
      </NativeAsset>

      {nativeAd.mediaContent ? (
        <NativeMediaView style={styles.media} resizeMode="cover" />
      ) : null}

      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
        </Pressable>
      </NativeAsset>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  titleArea: {
    flex: 1,
    gap: 2,
  },
  headline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
  },
  advertiser: {
    fontSize: 11,
    color: '#5F6368',
  },
  adBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    color: '#5F6368',
    lineHeight: 18,
  },
  media: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cta: {
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
