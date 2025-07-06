import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { env } from './src/utils/env'; // Import our new environment utility
import { enableApiMocking } from './e2e/mockApi';

Sentry.init({
	dsn: 'https://d95e19e8195840a7b2bcd5fb6fed1695@o4509373194960896.ingest.us.sentry.io/4509373200138240',

	// Environment configuration
	environment: __DEV__ ? 'development' : 'production',
	release: Constants.expoConfig?.version || '1.0.0',
	debug: __DEV__,

	// Performance monitoring
	tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in production

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Configure Session Replay
	replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in production
	replaysOnErrorSampleRate: 1,
	integrations: [
		Sentry.mobileReplayIntegration(),
		// Add performance monitoring
		Sentry.reactNativeTracingIntegration(),
	],

	// Enable Spotlight for development debugging
	spotlight: __DEV__,

	// Filtering sensitive data
	beforeSend(event) {
		// Filter out sensitive information in production
		if (!__DEV__ && event.user?.id && typeof event.user.id === 'string') {
			// Keep only first 8 characters of wallet address for privacy
			event.user.id = event.user.id.substring(0, 8) + '...';
		}
		return event;
	},
});

// Conditionally start MSW worker
// Enable API mocking for E2E testing
if (env.e2eMockingEnabled) {
	console.log('� Enabling API mocking for E2E testing...');
	enableApiMocking();
}

import 'react-native-gesture-handler';
import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureReanimatedLogger } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Navigation from '@components/Common/Navigation';
import { themes, extendedThemeProperties, AppTheme } from '@utils/theme';
import { ToastProvider } from '@components/Common/Toast';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import WalletSetupScreen from '@screens/WalletSetup';
import { Keypair } from '@solana/web3.js';
import { initializeDebugWallet } from '@/utils/debugWallet'; // Import for debug wallet
import { retrieveWalletFromStorage } from '@/utils/keychainService'; // Import for wallet retrieval
import { logger } from '@/utils/logger';
import { initializeFirebaseServices } from '@/services/firebaseInit';
import { useThemeStore } from '@/store/theme';

// DEBUG: Log all environment variables at app startup
console.log('| ==== ENVIRONMENT VARIABLES DEBUG ====');
console.log('| process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('| __DEV__:', __DEV__);
console.log('| Environment via Expo Constants:', env);
console.log('| APP_ENV:', env.appEnv);
console.log('| API_URL:', env.apiUrl);
console.log('| SOLANA_RPC_ENDPOINT:', env.solanaRpcEndpoint);
console.log('| DEBUG_MODE:', env.debugMode);
console.log('| LOAD_DEBUG_WALLET:', env.loadDebugWallet);
console.log('| E2E_MOCKING_ENABLED:', env.e2eMockingEnabled);
console.log('| ==== END ENVIRONMENT VARIABLES DEBUG ====');


// Disable Reanimated strict mode warnings
configureReanimatedLogger({
	strict: false,
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	gestureHandlerRoot: {
		flex: 1,
	},
});

const App: React.FC = () => {
	const [appIsReady, setAppIsReady] = useState(false);
	const [needsWalletSetup, setNeedsWalletSetup] = useState<boolean | null>(null);
	const { setWallet, wallet } = usePortfolioStore();

	// Use the theme store instead of local state
	const { themeType } = useThemeStore();

	const handleWalletSetupComplete = useCallback(async (newKeypair: Keypair) => {
		logger.breadcrumb({ message: 'App: Wallet setup complete, navigating to main app', category: 'app_lifecycle' });
		const newPublicKey = newKeypair.publicKey.toBase58();
		await setWallet(newPublicKey);

		logger.info("App: Fetching initial transactions and balance after new wallet setup.", { newPublicKey });
		// useTransactionsStore.getState().fetchRecentTransactions(newPublicKey);
		try {
			await usePortfolioStore.getState().fetchPortfolioBalance(newPublicKey);
		} catch (error) {
			logger.warn('Failed to fetch portfolio balance after wallet setup:', error);
			// Don't block wallet setup completion - user can retry later
		}

		setNeedsWalletSetup(false);
	}, [setWallet]);


	useEffect(() => {
		// This effect runs once on app mount
		logger.log('App launched'); // Using logger.log as per previous convention for general app info
		Sentry.setContext('appStart', {
			version: Constants.expoConfig?.version,
			build: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString(), // Handle Android build number
			timestamp: new Date().toISOString()
		});

		async function prepare() {
			// Theme is now handled by the theme store

			if (env.loadDebugWallet) {
				logger.info("LOAD_DEBUG_WALLET is true. Attempting to initialize debug wallet automatically...");
				const debugKeypair = await initializeDebugWallet();
				if (debugKeypair) {
					logger.info("Debug wallet initialized successfully via App.tsx. Finalizing setup...");
					await handleWalletSetupComplete(debugKeypair);
					logger.info("Debug wallet setup complete. App will proceed to main content.");
				} else {
					logger.error("Failed to initialize debug wallet. Proceeding with normal wallet check/setup flow.");
				}
			}

			// Existing logger.breadcrumb call for starting authentication
			logger.breadcrumb({ message: 'App: Preparing - Initializing Firebase', category: 'app_lifecycle' });
			try {
				await initializeFirebaseServices();
				logger.info("� Firebase services initialized successfully.");
			} catch (e) {
				logger.error('❌ Failed to initialize Firebase services', { error: e?.message });
				// Decide if this error should block app startup or be handled gracefully
			}

			// Load available coins for token selectors
			logger.breadcrumb({ message: 'App: Preparing - Loading available coins', category: 'app_lifecycle' });
			try {
				await useCoinStore.getState().fetchAvailableCoins();
				logger.info("✅ Available coins loaded successfully.");
			} catch (e) {
				logger.error('❌ Failed to load available coins', { error: e?.message });
				// Don't block app startup - token selectors will handle empty state
			}

			logger.breadcrumb({ message: 'App: Preparing - Checking wallet storage', category: 'app_lifecycle' });
			try {
				const publicKey = await retrieveWalletFromStorage();

				if (publicKey) {
					logger.info("Existing wallet found, setting in store.");
					logger.breadcrumb({ message: 'App: Existing wallet found', category: 'app_lifecycle' });
					Sentry.setUser({ id: publicKey }); // Set user context on initial load
					await setWallet(publicKey);

					logger.info("App: Fetching initial transactions and balance for existing wallet.", { publicKey });
					// useTransactionsStore.getState().fetchRecentTransactions(publicKey);
					try {
						await usePortfolioStore.getState().fetchPortfolioBalance(publicKey);
					} catch (error) {
						logger.warn('Failed to fetch portfolio balance during app startup:', error);
						// Don't block app startup - user can retry later
					}

					setNeedsWalletSetup(false);
				} else {
					logger.info("No existing wallet found, showing setup screen.");
					logger.breadcrumb({ message: 'App: No existing wallet found', category: 'app_lifecycle' });
					setNeedsWalletSetup(true);
				}
			} catch (e) {
				logger.warn('Error during app preparation', { error: e?.message }); // Using warn as it sets a UI state
				logger.breadcrumb({ message: 'App:image.png Error during preparation', category: 'app_lifecycle', data: { error: e?.message } });
				setNeedsWalletSetup(true);
			} finally {
				logger.breadcrumb({ message: 'App: Ready', category: 'app_lifecycle' });
				setAppIsReady(true);
			}
		}

		prepare();
	}, [setWallet, handleWalletSetupComplete]);

	// Effect to update Sentry user context when wallet address changes
	useEffect(() => {
		if (wallet?.address) {
			logger.info("Wallet address updated in store, setting Sentry user context.", { walletAddress: wallet.address });
			Sentry.setUser({ id: wallet.address });
		} else {
			// This case handles when the wallet is cleared from the store
			logger.info("Wallet address cleared from store, clearing Sentry user context.");
			Sentry.withScope(scope => scope.setUser(null));
		}
	}, [wallet?.address]);


	if (!appIsReady || needsWalletSetup === null) {
		return null;
	}

	// Get the current theme and merge with extended properties
	const paperTheme = {
		...themes[themeType],
		colors: {
			...themes[themeType].colors,
		},
		...extendedThemeProperties[themeType],
	} as unknown as AppTheme;

	// Set status bar style based on theme
	const statusBarStyle = themeType === 'light' ? 'dark' : 'light';

	return (
		<PaperProvider theme={paperTheme}>
			<StatusBar style={statusBarStyle} />
			<SafeAreaProvider>
				<GestureHandlerRootView style={styles.gestureHandlerRoot}>
					<ToastProvider>
						<BottomSheetModalProvider>
							<View style={styles.container}>
								<StatusBar style="auto" />
								{needsWalletSetup ? (
									(logger.breadcrumb({ message: 'App: Navigating to WalletSetupScreen', category: 'navigation' }),
										<WalletSetupScreen
											onWalletSetupComplete={handleWalletSetupComplete}
											onCreateWallet={() => { }}
											onImportWallet={() => { }}
										/>)
								) : (
									(logger.breadcrumb({ message: 'App: Navigating to MainTabs', category: 'navigation' }),
										<Navigation />)
								)}
							</View>
						</BottomSheetModalProvider>
					</ToastProvider>
				</GestureHandlerRootView>
			</SafeAreaProvider>
		</PaperProvider>
	);
};

export default Sentry.wrap(App);

