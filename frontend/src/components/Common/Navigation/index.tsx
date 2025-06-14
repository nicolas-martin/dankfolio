import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '@/types/navigation';
import { navigationMiddleware } from './middleware';
import CustomHeader from './CustomHeader';
import { HomeIcon, SearchIcon, ProfileIcon } from '@components/Common/Icons';
import { BottomNavigation } from 'react-native-paper';
import { useMemo } from 'react';
import Home from '@screens/Home';
import Profile from '@screens/Profile';
import Search from '@screens/Search';
import CoinDetail from '@screens/CoinDetail';
import Trade from '@screens/Trade';
import Send from '@screens/Send';
import Settings from '@screens/Settings';
import { useStyles } from './navigation.style';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();


const TabNavigator = () => {
	const styles = useStyles();

	const tabScreenOptions = useMemo(() => ({
		headerShown: false
	}), []);

	return (
		<Tab.Navigator
			initialRouteName="Home"
			screenOptions={tabScreenOptions}
			tabBar={({ navigation, state }) => (
				<BottomNavigation.Bar
					navigationState={state}
					shifting={false}
					activeColor={styles.colors.primary}
					inactiveColor={styles.colors.onSurfaceVariant}
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
					style={styles.bottomNavBar} // Use StyleSheet
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

// Defined outside Navigation component
const renderCustomHeader = () => <CustomHeader />;

const Navigation = () => {
	const mainTabsOptions = useMemo(() => ({ // Memoized
		headerShown: false
	}), []);

	const customHeaderOptions = useMemo(() => ({ // Memoized
		header: renderCustomHeader
	}), []); // renderCustomHeader is stable

	const stackScreenOptions = useMemo(() => ({
		headerShown: true,
		animation: 'slide_from_right' as const,
	}), []);

	return (
		<NavigationContainer onStateChange={navigationMiddleware}>
			<Stack.Navigator
				initialRouteName="MainTabs"
				screenOptions={stackScreenOptions}
			>
				<Stack.Screen
					name="MainTabs"
					options={mainTabsOptions} // Use memoized options
				>
					{() => <TabNavigator />}
				</Stack.Screen>
				<Stack.Screen
					name="CoinDetail"
					component={CoinDetail}
					options={customHeaderOptions} // Use memoized options
				/>
				<Stack.Screen
					name="Trade"
					component={Trade}
					options={customHeaderOptions} // Use memoized options
				/>
				<Stack.Screen
					name="SendTokens"
					component={Send}
					options={customHeaderOptions} // Use memoized options
				/>
				<Stack.Screen
					name="Settings"
					component={Settings}
					options={customHeaderOptions} // Use memoized options
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
};

export default Navigation;
