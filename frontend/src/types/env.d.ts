declare module '@env' {
	export const DEBUG_MODE: string;
	// Application Environment
	export const APP_ENV: string; // e.g., "local", "development", "staging", "production"
	export const TEST_PRIVATE_KEY: string;
	export const REACT_APP_API_URL: string;
	export const REACT_APP_JUPITER_API_URL: string;
	export const REACT_APP_SOLANA_RPC_ENDPOINT: string;
	
	// Firebase Configuration
	export const FIREBASE_API_KEY: string;
	export const FIREBASE_AUTH_DOMAIN: string;
	export const FIREBASE_PROJECT_ID: string;
	export const FIREBASE_STORAGE_BUCKET: string;
	export const FIREBASE_MESSAGING_SENDER_ID: string;
	export const FIREBASE_APP_ID: string;
	
	// Firebase App Check Configuration
	export const DEV_APP_CHECK_TOKEN: string;
} 