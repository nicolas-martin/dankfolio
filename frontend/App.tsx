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
		await setWallet(newKeypair.publicKey.toBase58());
		setNeedsWalletSetup(false);
	};

	useEffect(() => {
		async function prepare() {
			try {
				const publicKey = await retrieveWalletFromStorage();

				if (publicKey) {
					console.log("Existing wallet found, setting in store.");
					await setWallet(publicKey);
					setNeedsWalletSetup(false);
				} else {
					console.log("No existing wallet found, showing setup screen.");
					setNeedsWalletSetup(true);
				}
			} catch (e) {
				console.warn('Error during app preparation:', e);
				setNeedsWalletSetup(true);
			} finally {
				setAppIsReady(true);
			}
		}

		prepare();
	}, [setWallet]);

	const onLayoutRootView = useCallback(async () => {
		if (appIsReady) {
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
								<WalletSetupScreen
									onWalletSetupComplete={handleWalletSetupComplete}
									onCreateWallet={() => { }}
									onImportWallet={() => { }}
								/>
							) : (
								<Navigation />
							)}
						</View>
					</ToastProvider>
				</PaperProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
};

export default Sentry.wrap(App);
