import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { navigationMiddleware } from './middleware';
import CustomHeader from './CustomHeader';

// Import screens
import Home from '@screens/Home';
import Profile from '@screens/Profile';
import CoinDetail from '@screens/CoinDetail';
import Trade from '@screens/Trade';
import SendTokens from '@screens/SendTokens';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation = () => {
	return (
		<NavigationContainer onStateChange={navigationMiddleware}>
			<Stack.Navigator
				initialRouteName="Home"
				screenOptions={{
					header: () => <CustomHeader />,
					headerShown: true,
					contentStyle: { backgroundColor: '#1A1A2E' },
					animation: 'slide_from_right',
				}}
			>
				<Stack.Screen name="Home" component={Home} />
				<Stack.Screen name="Profile" component={Profile} />
				<Stack.Screen name="CoinDetail" component={CoinDetail} />
				<Stack.Screen name="Trade" component={Trade} />
				<Stack.Screen name="SendTokens" component={SendTokens} />
			</Stack.Navigator>
		</NavigationContainer>
	);
};

export default Navigation;
