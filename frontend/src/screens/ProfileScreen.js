import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { getSPLTokenBalances } from '../services/walletService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ route, navigation }) => {
  const { walletAddress } = route.params || { walletAddress: '' };
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState('0');

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const tokenBalances = await getSPLTokenBalances(walletAddress);
        setTokens(tokenBalances);
        
        // Calculate total balance (this is simplified)
        const total = tokenBalances.reduce((sum, token) => {
          // This is a very simple calculation, in reality you'd need to get market prices
          return sum + (parseInt(token.amount) / Math.pow(10, token.decimals));
        }, 0);
        
        setTotalBalance(total.toFixed(2));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setLoading(false);
      }
    };

    fetchTokens();
  }, [walletAddress]);

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format token amount based on decimals
  const formatAmount = (amount, decimals) => {
    const value = parseFloat(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 6 
    });
  };

  const renderTokenItem = ({ item }) => (
    <View style={styles.tokenItem}>
      <View style={styles.tokenLeft}>
        {item.logo ? (
          <Image 
            source={{ uri: item.logo }} 
            style={styles.tokenLogo}
          />
        ) : (
          <View style={[styles.tokenLogo, styles.tokenLogoPlaceholder]}>
            <Text style={styles.tokenLogoText}>{item.symbol ? item.symbol.slice(0, 2) : '?'}</Text>
          </View>
        )}
        <View style={styles.tokenDetails}>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
          <Text style={styles.tokenName}>{item.name}</Text>
        </View>
      </View>
      <View style={styles.tokenRight}>
        <Text style={styles.tokenAmount}>
          {formatAmount(item.amount, item.decimals)}
        </Text>
        <Text style={styles.tokenValue}>
          ${(formatAmount(item.amount, item.decimals) * 1).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#181829', '#1f1f35']}
        style={styles.header}
      >
        <View style={styles.profileSection}>
          <Image 
            source={{ uri: 'https://static.vecteezy.com/system/resources/previews/008/214/517/non_2x/abstract-geometric-logo-or-infinity-line-logo-for-your-company-free-vector.jpg' }} 
            style={styles.profileImage}
          />
          <Text style={styles.walletAddress}>{formatAddress(walletAddress)}</Text>
          <TouchableOpacity style={styles.copyButton}>
            <Text style={styles.copyButtonText}>Copy Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>${totalBalance}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Swap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>My Tokens</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#6A5ACD" style={styles.loader} />
        ) : (
          <FlatList
            data={tokens}
            keyExtractor={item => item.mint}
            renderItem={renderTokenItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tokenList}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E1B',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#6A5ACD',
  },
  walletAddress: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  copyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(106, 90, 205, 0.2)',
    borderRadius: 12,
  },
  copyButtonText: {
    color: '#6A5ACD',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8C8CA1',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6A5ACD',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  tokenList: {
    paddingBottom: 20,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenDetails: {
    justifyContent: 'center',
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tokenName: {
    fontSize: 14,
    color: '#8C8CA1',
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tokenValue: {
    fontSize: 14,
    color: '#8C8CA1',
  },
  loader: {
    marginTop: 50,
  },
  tokenLogoPlaceholder: {
    backgroundColor: '#6A5ACD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenLogoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProfileScreen; 