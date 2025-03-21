import './src/utils/polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from './src/components/common/Toast';

// Import screens
import Home from './src/screens/Home';
import Trade from './src/screens/Trade';
import CoinDetailScreen from './src/screens/CoinDetail';
import Profile from './src/screens/Profile';
import { RootStackParamList } from './src/types/index';

// Create stack navigator with types
const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
	return (
		<ToastProvider>
			<NavigationContainer>
				<StatusBar style="light" />
				<Stack.Navigator
					id={undefined}
					initialRouteName="Home"
					screenOptions={{
						headerShown: false,
						contentStyle: { backgroundColor: '#1A1A2E' },
						animation: 'slide_from_right',
					}}
				>
					<Stack.Screen name="Home" component={Home} />
					<Stack.Screen name="Trade" component={Trade} />
					<Stack.Screen name="CoinDetail" component={CoinDetailScreen} />
					<Stack.Screen name="Profile" component={Profile} />
				</Stack.Navigator>
			</NavigationContainer>
		</ToastProvider>
	);
};

export default App;
