import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { CoinListScreen } from './screens/CoinListScreen';
import { CoinDetailScreen } from './screens/CoinDetailScreen';
import { PortfolioScreen } from './screens/PortfolioScreen';
import { WalletScreen } from './screens/WalletScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen 
              name="CoinList" 
              component={CoinListScreen}
              options={{ title: 'Meme Coins' }}
            />
            <Stack.Screen 
              name="CoinDetail" 
              component={CoinDetailScreen}
              options={({ route }) => ({ title: route.params?.symbol })}
            />
            <Stack.Screen 
              name="Portfolio" 
              component={PortfolioScreen}
              options={{ title: 'My Portfolio' }}
            />
            <Stack.Screen 
              name="Wallet" 
              component={WalletScreen}
              options={{ title: 'Wallet' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 