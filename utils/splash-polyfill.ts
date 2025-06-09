import { requireOptionalNativeModule } from 'expo';

const SplashModule = requireOptionalNativeModule('ExpoSplashScreen');
if (SplashModule) {
  SplashModule.internalPreventAutoHideAsync =
    SplashModule.internalPreventAutoHideAsync || (() => Promise.resolve());
  SplashModule.internalMaybeHideAsync =
    SplashModule.internalMaybeHideAsync || (() => Promise.resolve());
}

export {};
