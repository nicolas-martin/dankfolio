import './src/utils/polyfills';
import React from 'react';
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
  return (
    <SafeAreaProvider>
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
