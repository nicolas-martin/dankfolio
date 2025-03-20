import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WalletBalanceResponse } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/index';
import TopBar from '../components/TopBar';
import { Coin } from '../types/index';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ProfileScreenProps {
  route: {
    params: {
      walletBalance: WalletBalanceResponse;
      walletAddress: string;
      solCoin: Coin | null;
    };
  };
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ route }) => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { walletBalance, walletAddress, solCoin } = route.params;
  const totalValue = walletBalance.tokens.reduce((sum, token) => sum + token.value, 0);

  const handleTokenPress = (token: WalletBalanceResponse['tokens'][0]) => {
    if (!token.id) {
      console.error('❌ No token ID available for:', token.symbol);
      return;
    }

    console.log('🎯 Navigating to token details:', {
      symbol: token.symbol,
      address: token.id,
      name: token.name,
      solCoin: solCoin ? {
        id: solCoin.id,
        symbol: solCoin.symbol,
        name: solCoin.name,
        decimals: solCoin.decimals,
        price: solCoin.price
      } : null
    });


    navigation.navigate('CoinDetail', {
      coinId: token.id,
      coinName: token.name,
      coin: token,
      solCoin: solCoin
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🎭 Profile</Text>
          <Text style={styles.subtitle}>Your Portfolio</Text>
          <Text style={styles.addressText}>Address: {walletAddress}</Text>
        </View>

        <View style={styles.portfolioCard}>
          <Text style={styles.portfolioTitle}>Total Value</Text>
          <Text style={styles.portfolioValue}>${totalValue.toFixed(2)}</Text>
        </View>

        <View style={styles.tokensContainer}>
          <Text style={styles.sectionTitle}>Your Assets</Text>
          {walletBalance.tokens.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No assets found in wallet 🔍</Text>
            </View>
          ) : (
            walletBalance.tokens.map((token) => (
              <TouchableOpacity
                key={token.symbol}
                style={styles.tokenCard}
                onPress={() => handleTokenPress(token)}
                activeOpacity={0.7}
              >
                <View style={styles.tokenHeader}>
                  {token.icon_url && (
                    <Image 
                      source={{ uri: token.icon_url }} 
                      style={styles.tokenLogo} 
                    />
                  )}
                  <View style={styles.tokenInfo}>
                    <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                    <Text style={styles.tokenName}>{token.name}</Text>
                  </View>
                </View>
                <View style={styles.tokenDetails}>
                  <View style={styles.tokenDetail}>
                    <Text style={styles.detailLabel}>Balance</Text>
                    <Text style={styles.detailValue}>{token.balance.toFixed(4)}</Text>
                  </View>
                  <View style={styles.tokenDetail}>
                    <Text style={styles.detailLabel}>Value</Text>
                    <Text style={styles.detailValue}>${token.value.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tokenDetail}>
                    <Text style={styles.detailLabel}>Price</Text>
                    <Text style={styles.detailValue}>${token.price.toFixed(4)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  addressText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  portfolioCard: {
    backgroundColor: '#2A2A3E',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    alignItems: 'center',
  },
  portfolioTitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 10,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  tokensContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  tokenCard: {
    backgroundColor: '#2A2A3E',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  tokenName: {
    fontSize: 14,
    color: '#888',
  },
  tokenDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tokenDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ProfileScreen; 