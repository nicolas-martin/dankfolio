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
import Navigation from './src/navigation';
import { theme as appTheme } from './src/utils/theme';
import { ToastProvider } from './src/components/Common/Toast';

// Disable Reanimated strict mode warnings
configureReanimatedLogger({
  strict: false,
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    async function prepare() {
      try {
        // Artificially delay for 2 seconds to show the splash screen
        await new Promise(resolve => setTimeout(resolve, 2000));
        // You can replace the delay with actual asset/font loading, etc.
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately!
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // Render nothing while the app is not ready (splash screen is visible)
  }

  return (
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
  );
};

export default App;
