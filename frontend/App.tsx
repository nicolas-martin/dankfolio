import './src/utils/polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { ToastProvider } from './src/components/common/Toast';

// Import screens
import HomeScreen from './src/screens/HomeScreen'
import TradeScreen from './src/screens/TradeScreen';
import CoinDetailScreen from './src/screens/CoinDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
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
					<Stack.Screen name="Home" component={HomeScreen} />
					<Stack.Screen name="Trade" component={TradeScreen} />
					<Stack.Screen name="CoinDetail" component={CoinDetailScreen} />
					<Stack.Screen name="Profile" component={ProfileScreen} />
				</Stack.Navigator>
			</NavigationContainer>
		</ToastProvider>
	);
};

export default App;
