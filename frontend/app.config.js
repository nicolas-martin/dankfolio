// Load environment variables from .env file when running locally
import 'dotenv/config';

// Get the environment mode
const appEnv = process.env.APP_ENV || 'development';
const isLocal = process.argv.includes('--local');

if (isLocal) {
	console.log('📱 Loading environment variables from .env file');
}

module.exports = ({ config }) => ({
	...config,
	name: "Kaiju",
	slug: "kaiju",
	owner: "martinni39",
	version: "1.0.0",
	orientation: "portrait",
	icon: "./assets/icon.png",
	userInterfaceStyle: "dark",
	splash: {
		image: "./assets/splash.png",
		resizeMode: "contain",
		backgroundColor: "#ffffff"
	},
	plugins: [
		[
			"expo-dev-client",
			{
				"launchMode": "most-recent"
			}
		],
		"expo-secure-store",
		[
			"expo-build-properties",
			{
				"ios": {
					"useFrameworks": "static"
				}
			}
		],
		[
			"@sentry/react-native/expo",
			{
				"organization": "corsair",
				"project": "kaiju",
				"url": "https://sentry.io/"
			}
		],
		"@react-native-firebase/app",
		"@react-native-firebase/app-check"
	],
	newArchEnabled: false,
	assetBundlePatterns: [
		"**/*"
	],
	ios: {
		...config.ios,
		icon: "./assets/icon.png",
		supportsTablet: true,
		bundleIdentifier: "com.nicolasmartin.kaiju",
		googleServicesFile: "./GoogleService-Info.plist",
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false
		}
	},
	android: {
		package: "com.nicolasmartin.kaiju",
		googleServicesFile: "./google-services.json"
	},
	extra: {
		// Environment variables will be available here
		APP_ENV: process.env.APP_ENV,
		DEBUG_MODE: process.env.DEBUG_MODE,
		REACT_APP_API_URL: process.env.REACT_APP_API_URL,
		REACT_APP_SOLANA_RPC_ENDPOINT: process.env.REACT_APP_SOLANA_RPC_ENDPOINT,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		DEV_APP_CHECK_TOKEN: process.env.DEV_APP_CHECK_TOKEN,
		TEST_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY,
		LOAD_DEBUG_WALLET: process.env.LOAD_DEBUG_WALLET,
		E2E_MOCKING_ENABLED: process.env.E2E_MOCKING_ENABLED,
		DEV_APP_CHECK_TOKEN: process.env.DEV_APP_CHECK_TOKEN,
		eas: {
			projectId: "eb2b8734-d3c5-4fe6-8115-e393ffad825f"
		}
	},
	runtimeVersion: {
		policy: "sdkVersion"
	}
}); 
