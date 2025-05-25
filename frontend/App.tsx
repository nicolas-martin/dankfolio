import 'react-native-gesture-handler';
import './src/utils/polyfills';
import React, { useEffect, useCallback, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureReanimatedLogger } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigation from '@components/Common/Navigation';
import { theme as appTheme } from '@utils/theme';
import { ToastProvider } from '@components/Common/Toast';
import { usePortfolioStore } from '@store/portfolio';
import { retrieveWalletFromStorage } from '@screens/WalletSetup/scripts';
import WalletSetupScreen from '@screens/WalletSetup';
import { Keypair } from '@solana/web3.js';
import * as Sentry from '@sentry/react-native';
import { logger } from '@/utils/logger';
import Constants from 'expo-constants';
import { authService } from '@/services/authService';
import { initializeFirebaseServices } from '@/services/firebaseInit';

Sentry.init({
	dsn: 'https://d95e19e8195840a7b2bcd5fb6fed1695@o4509373194960896.ingest.us.sentry.io/4509373200138240',

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Configure Session Replay
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1,
	integrations: [Sentry.mobileReplayIntegration()],

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: __DEV__,
});

// Disable Reanimated strict mode warnings
configureReanimatedLogger({
	strict: false,
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure splash screen animation
SplashScreen.setOptions({
	duration: 1000,
	fade: true,
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
		error: appTheme.colors.error,
		onPrimary: appTheme.colors.onPrimary,
		onSecondary: appTheme.colors.onSecondary,
		onBackground: appTheme.colors.onBackground,
		onSurface: appTheme.colors.onSurface,
		onError: appTheme.colors.onError,
		outline: appTheme.colors.outline,
		outlineVariant: appTheme.colors.outlineVariant,
		warning: appTheme.colors.warning,
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
		await setWallet(newKeypair.publicKey.toBase58());
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

			logger.breadcrumb({ message: 'App: Preparing - Initializing authentication', category: 'app_lifecycle' });
			try {
				// Initialize authentication service first
				await authService.initialize();
				logger.info("Authentication service initialized successfully");
			} catch (e) {
				logger.error('Failed to initialize authentication service', { error: e?.message });
				// Don't block app startup if auth fails - the auth service will retry on demand
			}

			logger.breadcrumb({ message: 'App: Preparing - Checking wallet storage', category: 'app_lifecycle' });
			try {
				const publicKey = await retrieveWalletFromStorage();

				if (publicKey) {
					logger.info("Existing wallet found, setting in store.");
					logger.breadcrumb({ message: 'App: Existing wallet found', category: 'app_lifecycle' });
					Sentry.setUser({ id: publicKey }); // Set user context on initial load
					await setWallet(publicKey);
					setNeedsWalletSetup(false);
				} else {
					logger.info("No existing wallet found, showing setup screen.");
					logger.breadcrumb({ message: 'App: No existing wallet found', category: 'app_lifecycle' });
					setNeedsWalletSetup(true);
				}
			} catch (e) {
				logger.warn('Error during app preparation', { error: e?.message }); // Using warn as it sets a UI state
				logger.breadcrumb({ message: 'App: Error during preparation', category: 'app_lifecycle', data: { error: e?.message } });
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
		if (appIsReady) {
			logger.breadcrumb({ message: 'App: Layout ready, hiding splash screen', category: 'app_lifecycle' });
			await SplashScreen.hideAsync();
		}
	}, [appIsReady]);

	if (!appIsReady || needsWalletSetup === null) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider onLayout={onLayoutRootView}>
				<PaperProvider theme={paperTheme}>
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
				</PaperProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
};

export default Sentry.wrap(App);
