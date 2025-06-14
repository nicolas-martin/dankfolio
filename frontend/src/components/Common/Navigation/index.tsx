import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '@/types/navigation';
import { navigationMiddleware } from './middleware';
import CustomHeader from './CustomHeader';
import { HomeIcon, SearchIcon, ProfileIcon } from '@components/Common/Icons';
import { useTheme, BottomNavigation, MD3Theme } from 'react-native-paper'; // Added MD3Theme
import { Platform, StyleSheet } from 'react-native'; // Added StyleSheet
import { useMemo } from 'react'; // Added useMemo

import Home from '@screens/Home';
import Profile from '@screens/Profile';
import Search from '@screens/Search';
import CoinDetail from '@screens/CoinDetail';
import Trade from '@screens/Trade';
import Send from '@screens/Send';
import Settings from '@screens/Settings';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const useTabNavigatorStyles = () => {
  const theme = useTheme() as MD3Theme; // Ensure MD3Theme is the correct type
  
  const shadowOffset = useMemo(() => ({ width: 0, height: -2 }), []);
  
  return useMemo(() => StyleSheet.create({
    // eslint-disable-next-line react-native/no-unused-styles
    bottomNavBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 0,
      height: Platform.select({
        ios: 88,
        android: 80,
      }),
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: shadowOffset,
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
  }), [theme, shadowOffset]);
};

const TabNavigator = () => {
	const styles = useTabNavigatorStyles();
	const theme = useTheme(); // Still needed for activeColor, inactiveColor

	const tabScreenOptions = useMemo(() => ({ // Memoized
		headerShown: false
	}), []);

	return (
		<Tab.Navigator
			initialRouteName="Home"
			screenOptions={tabScreenOptions} // Applied
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
