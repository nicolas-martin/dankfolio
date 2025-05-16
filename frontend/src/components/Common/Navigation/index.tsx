import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialBottomTabNavigator } from 'react-native-paper/react-navigation';
import { RootStackParamList } from '@/types';
import { navigationMiddleware } from './middleware';
import CustomHeader from './CustomHeader';
import { HomeIcon, SearchIcon, ProfileIcon } from '@components/Common/Icons';
import { useTheme } from 'react-native-paper';

// Import screens
import Home from '@screens/Home';
import Profile from '@screens/Profile';
import Search from '@screens/Search';
import CoinDetail from '@screens/CoinDetail';
import Trade from '@screens/Trade';
import Send from '@screens/Send';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialBottomTabNavigator();

const TabNavigator = () => {
	const theme = useTheme();

	return (
		<Tab.Navigator
			initialRouteName="Home"
			shifting={false}
			activeColor={theme.colors.primary}
			inactiveColor={theme.colors.outline}
			barStyle={{
				backgroundColor: theme.colors.surface,
				borderTopWidth: 1,
				borderTopColor: theme.colors.outlineVariant,
				height: 100,
			}}
			labeled={true}
			theme={theme}
		>
			<Tab.Screen
				name="Home"
				component={Home}
				options={{
					tabBarLabel: 'Home',
					tabBarIcon: ({ color }: { color: string }) => <HomeIcon color={color} size={24} />,
				}}
			/>
			<Tab.Screen
				name="Search"
				component={Search}
				options={{
					tabBarLabel: 'Search',
					tabBarIcon: ({ color }: { color: string }) => <SearchIcon color={color} size={24} />,
				}}
			/>
			<Tab.Screen
				name="Profile"
				component={Profile}
				options={{
					tabBarLabel: 'Profile',
					tabBarIcon: ({ color }: { color: string }) => <ProfileIcon color={color} size={24} />,
				}}
			/>
		</Tab.Navigator>
	);
};

const Navigation = () => {
	return (
		<NavigationContainer onStateChange={navigationMiddleware}>
			<Stack.Navigator
				initialRouteName="MainTabs"
				screenOptions={{
					header: () => <CustomHeader />,
					headerShown: true,
					contentStyle: { backgroundColor: '#1A1A2E' },
					animation: 'slide_from_right',
				}}
			>
				<Stack.Screen
					name="MainTabs"
					component={TabNavigator}
					options={{ headerShown: false }}
				/>
				<Stack.Screen name="CoinDetail" component={CoinDetail} />
				<Stack.Screen name="Trade" component={Trade} />
				<Stack.Screen name="SendTokens" component={Send} />
			</Stack.Navigator>
		</NavigationContainer>
	);
};

export default Navigation;
