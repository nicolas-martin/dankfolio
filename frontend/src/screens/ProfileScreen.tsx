import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { WalletBalanceResponse, TokenInfo } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/index';
import TopBar from '../components/common/ui/TopBar';
import { Coin } from '../types/index';
import Clipboard from '@react-native-clipboard/clipboard';
import { useToast } from '../components/common/Toast';

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
  const { showToast } = useToast();
  const { walletBalance, walletAddress, solCoin } = route.params;
  
  // Calculate total value including SOL
  const tokenValue = walletBalance.tokens.reduce((sum, token) => sum + token.value, 0);
  const solValue = walletBalance.sol_balance * (solCoin?.price || 0);
  const totalValue = tokenValue + solValue;

  const handleTokenPress = (token: Coin | TokenInfo) => {
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
      solCoin: solCoin,
      walletBalance: walletBalance
    });
  };

  const copyToClipboard = (text: string, symbol: string) => {
    Clipboard.setString(text);
    showToast({
      type: 'success',
      message: `${symbol} contract address copied to clipboard`,
      icon: '📋'
    });
  };

  const formatAddress = (address: string) => {
    if (!address || address === '') return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const TokenCard = ({ token, balance, onPress }: { 
    token: Coin | TokenInfo, 
    balance: number,
    onPress: () => void 
  }) => (
    <TouchableOpacity
      style={styles.tokenCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tokenHeader}>
        <View style={styles.tokenHeaderLeft}>
          {token.icon_url && (
            <Image 
              source={{ uri: token.icon_url }} 
              style={styles.tokenLogo} 
            />
          )}
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenSymbol}>{token.symbol}</Text>
            <TouchableOpacity 
              style={styles.addressContainer}
              onPress={() => copyToClipboard(token.id || '', token.symbol)}
            >
              <Text style={styles.addressText}>{formatAddress(token.id)}</Text>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.tokenDetails}>
        <View style={styles.tokenDetail}>
          <Text style={styles.detailLabel}>Balance</Text>
          <Text style={styles.detailValue} numberOfLines={1} adjustsFontSizeToFit>
            {balance.toFixed(4)}
          </Text>
        </View>
        <View style={styles.tokenDetail}>
          <Text style={styles.detailLabel}>Value</Text>
          <Text style={styles.detailValue}>
            ${(balance * (token.price || 0)).toFixed(2)}
          </Text>
        </View>
        <View style={styles.tokenDetail}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={styles.detailValue}>
            ${token.price?.toFixed(4) || '0.0000'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBar />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🎭 Profile</Text>
          <Text style={styles.subtitle}>Your Portfolio</Text>
          <TouchableOpacity 
            onPress={() => copyToClipboard(walletAddress, 'Wallet')}
            style={styles.addressContainer}
          >
            <Text style={styles.walletAddressText}>Address: {formatAddress(walletAddress)}</Text>
            <Text style={styles.copyIcon}>📋</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.portfolioCard}>
          <Text style={styles.portfolioTitle}>Total Value</Text>
          <Text style={styles.portfolioValue}>${totalValue.toFixed(2)}</Text>
          
          {/* Portfolio Breakdown */}
          <View style={styles.portfolioBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>SOL Balance</Text>
              <Text style={styles.breakdownValue}>{walletBalance.sol_balance.toFixed(4)} SOL</Text>
              <Text style={styles.breakdownUsd}>${solValue.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Token Value</Text>
              <Text style={styles.breakdownValue}>{walletBalance.tokens.length} Tokens</Text>
              <Text style={styles.breakdownUsd}>${tokenValue.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tokensContainer}>
          <Text style={styles.sectionTitle}>Your Assets</Text>
          
          {/* SOL Balance Card */}
          {solCoin && (
            <TokenCard 
              token={solCoin}
              balance={walletBalance.sol_balance}
              onPress={() => handleTokenPress(solCoin)}
            />
          )}

          {/* Token List */}
          {walletBalance.tokens.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No token assets found in wallet 🔍</Text>
            </View>
          ) : (
            walletBalance.tokens.map((token) => (
              <TokenCard
                key={token.symbol}
                token={token}
                balance={token.balance}
                onPress={() => handleTokenPress(token)}
              />
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
    backgroundColor: '#191B1F',
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
  walletAddressText: {
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
  portfolioBreakdown: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 15,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  breakdownValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  breakdownUsd: {
    fontSize: 14,
    color: '#6A5ACD',
    fontWeight: '500',
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
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  tokenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  tokenInfo: {
    flex: 1,
    gap: 4,
  },
  tokenSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.7,
  },
  addressText: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  copyIcon: {
    fontSize: 12,
  },
  tokenDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tokenDetail: {
    flex: 1,
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
    textAlign: 'center',
  },
});

export default ProfileScreen; 