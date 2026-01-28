/**
 * Expo App Configuration
 * Dynamic configuration that reads from environment variables
 *
 * Usage:
 * - Development: Uses default values
 * - Production: Set environment variables before building
 */

const IS_PRODUCTION = process.env.APP_ENV === 'production';
const IS_STAGING = process.env.APP_ENV === 'staging';

// API URLs
const API_URL = process.env.API_URL ||
  (IS_PRODUCTION ? 'https://api.rork.app' :
   IS_STAGING ? 'https://staging-api.rork.app' :
   'http://localhost:5000');

// App identifiers
const APP_NAME = process.env.APP_NAME || 'Rork Nightlife';
const APP_SLUG = process.env.APP_SLUG || 'rork-nightlife';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const BUILD_NUMBER = process.env.BUILD_NUMBER || '1';

// Bundle identifiers
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || 'app.rork.nightlife';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || 'app.rork.nightlife';

// EAS Build configuration
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '';

module.exports = {
  expo: {
    name: APP_NAME,
    slug: APP_SLUG,
    version: APP_VERSION,
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'rork-app',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },

    ios: {
      supportsTablet: false,
      bundleIdentifier: IOS_BUNDLE_ID,
      buildNumber: BUILD_NUMBER,
      infoPlist: {
        NSCameraUsageDescription: 'Rork needs camera access to capture venue moments and create video highlights.',
        NSMicrophoneUsageDescription: 'Rork needs microphone access to record video highlights.',
        NSPhotoLibraryUsageDescription: 'Rork needs photo library access to upload your memories.',
        NSLocationWhenInUseUsageDescription: 'Rork needs your location to verify you\'re at a venue when capturing memories.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'Rork needs your location to verify you\'re at a venue.',
        NSLocationAlwaysUsageDescription: 'Rork needs your location to discover nearby venues.',
        UIBackgroundModes: ['audio', 'location'],
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || 'AIzaSyBTR8B7HNcmI58gqKP23Pr0Bb0uO4ymJhI',
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      package: ANDROID_PACKAGE,
      versionCode: parseInt(BUILD_NUMBER, 10),
      permissions: [
        'android.permission.VIBRATE',
        'CAMERA',
        'RECORD_AUDIO',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || 'AIzaSyBTR8B7HNcmI58gqKP23Pr0Bb0uO4ymJhI',
        },
      },
    },

    web: {
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },

    plugins: [
      [
        'expo-router',
        {
          origin: IS_PRODUCTION ? 'https://rork.app/' : 'https://rork.com/',
        },
      ],
      'expo-font',
      'expo-web-browser',
      [
        'expo-camera',
        {
          cameraPermission: 'Rork needs camera access to capture venue moments.',
          microphonePermission: 'Rork needs microphone access to record videos.',
          recordAudioAndroid: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Rork needs access to your photos to upload memories.',
        },
      ],
      [
        'expo-av',
        {
          microphonePermission: 'Rork needs microphone access to record video highlights.',
        },
      ],
      [
        'expo-location',
        {
          isAndroidForegroundServiceEnabled: true,
          isAndroidBackgroundLocationEnabled: false, // Set to true if background location needed
          isIosBackgroundLocationEnabled: false,
          locationAlwaysAndWhenInUsePermission: 'Rork needs your location to verify venue check-ins.',
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    // Extra configuration for runtime
    extra: {
      apiUrl: API_URL,
      environment: process.env.APP_ENV || 'development',
      easProjectId: EAS_PROJECT_ID,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      sentryDsn: process.env.SENTRY_DSN || '',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBTR8B7HNcmI58gqKP23Pr0Bb0uO4ymJhI',
      instagramClientId: process.env.INSTAGRAM_CLIENT_ID || '',
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },

    // Update channels for OTA updates
    updates: {
      fallbackToCacheTimeout: 0,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },

    // Runtime version for updates
    runtimeVersion: {
      policy: 'sdkVersion',
    },

    // Asset bundling
    assetBundlePatterns: ['**/*'],

    // Privacy
    privacy: 'public',

    // Hooks
    hooks: {
      postPublish: [],
    },
  },
};
