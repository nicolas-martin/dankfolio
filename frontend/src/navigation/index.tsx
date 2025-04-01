import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { navigationMiddleware } from './middleware';

// Import screens
import Home from '../screens/Home';
import Profile from '../screens/Profile';
import CoinDetail from '../screens/CoinDetail';
import Trade from '../screens/Trade';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation = () => {
	return (
		<NavigationContainer onStateChange={navigationMiddleware}>
			<Stack.Navigator
				initialRouteName="Home"
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: '#1A1A2E' },
					animation: 'slide_from_right',
				}}
			>
				<Stack.Screen name="Home" component={Home} />
				<Stack.Screen name="Profile" component={Profile} />
				<Stack.Screen name="CoinDetail" component={CoinDetail} />
				<Stack.Screen name="Trade" component={Trade} />
			</Stack.Navigator>
		</NavigationContainer>
	);
};

export default Navigation; 