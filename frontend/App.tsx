import './src/utils/polyfills';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider, Toast } from '@gluestack-ui/themed';
import { ToastProvider } from '@gluestack-ui/toast';
import Navigation from './src/navigation';
import { config } from './src/utils/gluestack-theme';

const App: React.FC = () => {
  return (
    <GluestackUIProvider config={config}>
      <ToastProvider>
        <StatusBar style="light" />
        <Navigation />
        <Toast />
      </ToastProvider>
    </GluestackUIProvider>
  );
};

export default App;
