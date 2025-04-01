import './src/utils/polyfills';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from './src/components/Common/Toast';
import Navigation from './src/navigation';

const App: React.FC = () => {
	return (
		<ToastProvider>
			<StatusBar style="light" />
			<Navigation />
		</ToastProvider>
	);
};

export default App;
