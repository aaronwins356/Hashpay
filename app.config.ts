import { ConfigContext, ExpoConfig } from 'expo/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const BITCOIN_RPC_URL = process.env.EXPO_PUBLIC_BITCOIN_RPC_URL ?? 'http://localhost:18332';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hashpay',
  slug: 'hashpay',
  version: '1.0.0',
  scheme: 'hashpay',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.hashpay.mobile',
  },
  android: {
    package: 'com.hashpay.mobile',
  },
  extra: {
    ...config.extra,
    apiBaseUrl: API_BASE_URL,
    bitcoinRpcUrl: BITCOIN_RPC_URL,
  },
  updates: {
    fallbackToCacheTimeout: 0,
    ...(config.updates ?? {}),
  },
  assetBundlePatterns: config.assetBundlePatterns ?? ['**/*'],
  plugins: config.plugins ?? [],
});
