import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '@/types/navigation';
import { navigationMiddleware } from './middleware';
import CustomHeader from './CustomHeader';
import { HomeIcon, SearchIcon, ProfileIcon } from '@components/Common/Icons';
import { useTheme, BottomNavigation } from 'react-native-paper';
import { Platform } from 'react-native';

// Import screens
import Home from '@screens/Home';
import Profile from '@screens/Profile';
import Search from '@screens/Search';
import CoinDetail from '@screens/CoinDetail';
import Trade from '@screens/Trade';
import Send from '@screens/Send';
import Settings from '@screens/Settings';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
	const theme = useTheme();

	return (
		<Tab.Navigator
			initialRouteName="Home"
			screenOptions={{ headerShown: false }}
			tabBar={({ navigation, state }) => (
				<BottomNavigation.Bar
					navigationState={state}
					shifting={false}
					activeColor={theme.colors.primary}
					inactiveColor={theme.colors.onSurfaceVariant}
					testID="bottom-navigation-bar-outer-layer"
					onTabPress={({ route }) => {
						const event = navigation.emit({
							type: 'tabPress',
							target: route.key,
							canPreventDefault: true,
						});

						if (!event.defaultPrevented) {
							navigation.navigate(route.name);
						}
					}}
					renderIcon={({ route, focused, color }) => {
						const iconSize = focused ? 26 : 22;
						switch (route.name) {
							case 'Home':
								return <HomeIcon color={color} size={iconSize} testID="bottom-nav-home" />;
							case 'Search':
								return <SearchIcon color={color} size={iconSize} testID="bottom-nav-search" />;
							case 'Profile':
								return <ProfileIcon color={color} size={iconSize} testID="bottom-nav-profile" />;
							default:
								return null;
						}
					}}
					getLabelText={({ route }) => {
						switch (route.name) {
							case 'Home':
								return 'Home';
							case 'Search':
								return 'Explore';
							case 'Profile':
								return 'Portfolio';
							default:
								return route.name;
						}
					}}
					style={{
						backgroundColor: theme.colors.surface,
						borderTopWidth: 0,
						height: Platform.select({
							ios: 88,
							android: 80,
						}),
						...Platform.select({
							ios: {
								shadowColor: '#000',
								shadowOffset: { width: 0, height: -2 },
								shadowOpacity: 0.1,
								shadowRadius: 8,
							},
							android: {
								elevation: 8,
							},
						}),
					}}
				/>
			)}
		>
			<Tab.Screen 
				name="Home" 
				component={Home}
			/>
			<Tab.Screen
				name="Search"
				component={Search}
			/>
			<Tab.Screen
				name="Profile"
				component={Profile}
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
					headerShown: true,
					animation: 'slide_from_right',
				}}
			>
				<Stack.Screen
					name="MainTabs"
					options={{
						headerShown: false
					}}
				>
					{() => <TabNavigator />}
				</Stack.Screen>
				<Stack.Screen
					name="CoinDetail"
					component={CoinDetail}
					options={{
						header: (_props) => <CustomHeader />
					}}
				/>
				<Stack.Screen
					name="Trade"
					component={Trade}
					options={{
						header: (_props) => <CustomHeader />
					}}
				/>
				<Stack.Screen
					name="SendTokens"
					component={Send}
					options={{
						header: (_props) => <CustomHeader />
					}}
				/>
				<Stack.Screen
					name="Settings"
					component={Settings}
					options={{
						header: (_props) => <CustomHeader />
					}}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
};

export default Navigation;
