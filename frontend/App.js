import './src/utils/polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TradeScreen from './src/screens/TradeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CoinDetailScreen from './src/screens/CoinDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Create stack navigator
const Stack = createNativeStackNavigator();

export default function App() {
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
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="CoinDetail" component={CoinDetailScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
