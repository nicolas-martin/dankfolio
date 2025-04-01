import './src/utils/polyfills';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import Navigation from './src/navigation';
import { theme as appTheme } from './src/utils/theme';
import Toast from './src/components/Common/Toast';

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
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const App: React.FC = () => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastOptions, setToastOptions] = useState({});

  const showToast = (options: any) => {
    setToastOptions(options);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  return (
    <PaperProvider theme={paperTheme}>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Navigation />
        <Toast />
      </View>
    </PaperProvider>
  );
};

export default App;
