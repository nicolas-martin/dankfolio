import 'react-native-gesture-handler';
import './src/utils/polyfills';
import React, { useEffect, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
	configureReanimatedLogger,
	ReanimatedLogLevel,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigation from './src/navigation';
import { theme as appTheme } from './src/utils/theme';
import { ToastProvider } from './src/components/Common/Toast';
import { usePortfolioStore } from './src/store/portfolio';
import { useCoinStore } from './src/store/coins';
import { handleImportWallet } from './src/screens/Home/home_scripts';
import { TEST_PRIVATE_KEY } from '@env';

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
	const [appIsReady, setAppIsReady] = React.useState(false);
	const { fetchPortfolioBalance, setWallet } = usePortfolioStore();
	const { fetchAvailableCoins } = useCoinStore();

	useEffect(() => {
		async function prepare() {
			try {
				// Initialize wallet first
				const wallet = await handleImportWallet(TEST_PRIVATE_KEY);
				if (wallet) {
					setWallet(wallet);
				}

				// Load all required data
				await Promise.all([
					fetchPortfolioBalance(wallet?.address),
					fetchAvailableCoins()
				]);
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
			}
		}

		prepare();
	}, [fetchPortfolioBalance, fetchAvailableCoins, setWallet]);

	const onLayoutRootView = useCallback(async () => {
		if (appIsReady) {
			// This tells the splash screen to hide immediately! If we call this after
			// `setAppIsReady`, then we may see a blank screen while the app is
			// loading its initial state and rendering its first pixels. So instead,
			// we hide the splash screen once we know the root view has already
			// performed layout.
			await SplashScreen.hideAsync();
		}
	}, [appIsReady]);

	if (!appIsReady) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider onLayout={onLayoutRootView}>
				<PaperProvider theme={paperTheme}>
					<ToastProvider>
						<View style={styles.container}>
							<StatusBar style="auto" />
							<Navigation />
						</View>
					</ToastProvider>
				</PaperProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
};

export default App;
