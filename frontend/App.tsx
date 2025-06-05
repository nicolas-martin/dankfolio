import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

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

import 'react-native-gesture-handler';
import './src/utils/polyfills';
import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureReanimatedLogger } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigation from '@components/Common/Navigation';
import { theme as appTheme } from '@utils/theme';
import { ToastProvider } from '@components/Common/Toast';
import { usePortfolioStore } from '@store/portfolio';
// import { useTransactionsStore } from '@store/transactions';
import { retrieveWalletFromStorage } from '@screens/WalletSetup/scripts';
import WalletSetupScreen from '@screens/WalletSetup';
import { Keypair } from '@solana/web3.js';
import { logger } from '@/utils/logger';
import { initializeFirebaseServices } from '@/services/firebaseInit';
import * as SplashScreen from 'expo-splash-screen';

// DEBUG: Log all environment variables at app startup
console.log('🔍 === ENVIRONMENT VARIABLES DEBUG ===');
console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 __DEV__:', __DEV__);

console.log('🔍 === END ENVIRONMENT VARIABLES DEBUG ===');

// Keep the splash screen visible while we fetch resources
try {
	SplashScreen.preventAutoHideAsync();
} catch (error) {
	logger.warn('Failed to prevent splash screen auto hide:', error);
}

// Disable Reanimated strict mode warnings
configureReanimatedLogger({
	strict: false,
});

const paperTheme = {
	...MD3LightTheme,
	colors: {
		...MD3LightTheme.colors,
		primary: appTheme.colors.primary,
		primaryContainer: appTheme.colors.primaryVariant,
		secondary: appTheme.colors.secondary,
		secondaryContainer: appTheme.colors.secondaryVariant,
		background: appTheme.colors.background,
		surface: appTheme.colors.surface,
		surfaceVariant: appTheme.colors.surface, // Using surface as fallback for surfaceVariant
		error: appTheme.colors.error,
		onPrimary: appTheme.colors.onPrimary,
		onSecondary: appTheme.colors.onSecondary,
		onBackground: appTheme.colors.onBackground,
		onSurface: appTheme.colors.onSurface,
		onSurfaceVariant: appTheme.colors.onSurfaceVariant,
		onError: appTheme.colors.onError,
		outline: appTheme.colors.outline,
		outlineVariant: appTheme.colors.outlineVariant,
		warning: appTheme.colors.warning,
		success: appTheme.colors.success,
		// Additional colors that might be missing
		tertiary: appTheme.colors.secondary, // Using secondary as fallback
		tertiaryContainer: appTheme.colors.secondaryVariant,
		onTertiary: appTheme.colors.onSecondary,
		onTertiaryContainer: appTheme.colors.onSecondary,
		errorContainer: appTheme.colors.error,
		onErrorContainer: appTheme.colors.onError,
		onPrimaryContainer: appTheme.colors.onPrimary,
		onSecondaryContainer: appTheme.colors.onSecondary,
	},
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
const App: React.FC = () => {
	const [appIsReady, setAppIsReady] = useState(false);
	const [needsWalletSetup, setNeedsWalletSetup] = useState<boolean | null>(null);
	const { setWallet, wallet } = usePortfolioStore();

	const handleWalletSetupComplete = async (newKeypair: Keypair) => {
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
	};

	useEffect(() => {
		// This effect runs once on app mount
		logger.log('App launched'); // Using logger.log as per previous convention for general app info
		Sentry.setContext('appStart', {
			version: Constants.expoConfig?.version,
			build: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString(), // Handle Android build number
			timestamp: new Date().toISOString()
		});

		async function prepare() {
			// Existing logger.breadcrumb call for starting authentication
			logger.breadcrumb({ message: 'App: Preparing - Initializing Firebase', category: 'app_lifecycle' });
			try {
				await initializeFirebaseServices();
				logger.info("🔥 Firebase services initialized successfully.");
			} catch (e) {
				logger.error('❌ Failed to initialize Firebase services', { error: e?.message });
				// Decide if this error should block app startup or be handled gracefully
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
	}, [setWallet]);

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

	const onLayoutRootView = useCallback(async () => {
		if (appIsReady && needsWalletSetup !== null) {
			// Hide the splash screen once the app is ready
			try {
				await SplashScreen.hideAsync();
				logger.info('Splash screen hidden successfully');
			} catch (error) {
				logger.warn('Failed to hide splash screen:', error);
			}
		}
	}, [appIsReady, needsWalletSetup]);

	if (!appIsReady || needsWalletSetup === null) {
		return null;
	}

	return (
		<PaperProvider theme={paperTheme}>
			<StatusBar style="light" />
			<SafeAreaProvider>
				<GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
					<ToastProvider>
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
					</ToastProvider>
				</GestureHandlerRootView>
			</SafeAreaProvider>
		</PaperProvider>
	);
};

export default Sentry.wrap(App);

