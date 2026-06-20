const IS_DEV = process.env.APP_ENV === 'development';

export default {
  expo: {
    name: IS_DEV ? 'いっぽ (dev)' : 'いっぽ',
    slug: 'ippo-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'cover',
      backgroundColor: '#F7F3EE',
    },
    ios: {
      bundleIdentifier: IS_DEV ? 'com.dabde.ippoapp.dev' : 'com.dabde.ippoapp',
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'cover',
        backgroundColor: '#F7F3EE',
      },
    },
    android: {
      package: IS_DEV ? 'com.dabde.ippoapp.dev' : 'com.dabde.ippoapp',
      permissions: ['SCHEDULE_EXACT_ALARM'],
      adaptiveIcon: {
        backgroundColor: '#F7F3EE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'cover',
        backgroundColor: '#F7F3EE',
      },
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-font',
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: '#C4623A',
          iosDisplayInForeground: true,
          iosPermissions: ['Alert', 'Badge', 'Sound'],
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F7F3EE',
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '8d3d6aca-2415-4638-abe7-7db7583c422a',
      },
    },
    owner: 'dabde',
  },
};
