// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * @react-navigation/native 중복 인스턴스 방지
 *
 * 문제: expo-router가 @react-navigation/native@7.1.28 을 내부 node_modules에 중첩 설치.
 *       프로젝트는 @react-navigation/native@7.1.31 을 직접 보유.
 *       두 버전이 각각 다른 LinkingContext 객체를 생성 →
 *       Provider(7.1.28)와 Consumer(7.1.31)가 다른 context 참조 →
 *       "Couldn't find a LinkingContext context." 오류 발생.
 *
 * 해결: 모든 @react-navigation/native 요청을 루트의 단일 파일로 강제 해결.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@react-navigation/native') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/@react-navigation/native/lib/module/index.js'
      ),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
