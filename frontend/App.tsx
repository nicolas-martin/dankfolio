import './src/utils/polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Coin } from './src/types';
import { Dispatch, SetStateAction } from 'react';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TradeScreen from './src/screens/TradeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CoinDetailScreen from './src/screens/CoinDetailScreen';
import CoinSelect from './src/screens/CoinSelect';
import TestPriceChartScreen from './src/screens/StockChartScreen';

// Define the root stack parameter list
export type RootStackParamList = {
        Home: undefined;
        Trade: {
                initialFromCoin?: Coin;
                initialToCoin?: Coin;
                wallet?: string;
                coins?: Coin[];
        };
        CoinDetail: {
                coinId: string;
        };
        Profile: {
                walletAddress?: string;
        };
        CoinSelect: {
                onSelect: Dispatch<SetStateAction<string>>;
                excludeCoinId: string;
                currentCoinId: string;
        };
};

// Create stack navigator with types
const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
        return (
                <NavigationContainer>
                        <StatusBar style="light" />
                        <Stack.Navigator
                                initialRouteName="Home"
                                screenOptions={{
                                        headerShown: false,
                                        contentStyle: { backgroundColor: '#1A1A2E' },
                                        animation: 'slide_from_right',
                                }}
                        >
                                <Stack.Screen name="Home" component={HomeScreen} />
                                <Stack.Screen name="Trade" component={TradeScreen} />
                                <Stack.Screen name="Profile" component={ProfileScreen} />
                                <Stack.Screen name="CoinDetail" component={CoinDetailScreen} />
                                <Stack.Screen name="CoinSelect" component={CoinSelect} />
                                <Stack.Screen name="TestPriceChart" component={TestPriceChartScreen} />
                        </Stack.Navigator>
                </NavigationContainer>
        );
};

const styles = StyleSheet.create({
        container: {
                flex: 1,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
        },
});

export default App; 
