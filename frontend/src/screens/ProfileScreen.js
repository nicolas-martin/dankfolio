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
  Dimensions,
  Alert
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import SolscanWalletService from '../services/WalletService.js';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ route, navigation }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalBalance, setTotalBalance] = useState(0);

  const walletService = new SolscanWalletService();
  const testWalletAddress = 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R'; // TODO: Replace with actual wallet address

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const tokenData = await walletService.getTokens(testWalletAddress);
      setTokens(tokenData);

      // Calculate total balance
      const total = tokenData.reduce((sum, token) => sum + token.value, 0);
      setTotalBalance(total);

      setError(null);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      Clipboard.setString(testWalletAddress);
      Alert.alert('Success', 'Wallet address copied to clipboard');
    } catch (err) {
      Alert.alert('Error', 'Failed to copy wallet address');
    }
  };

  const renderTokenItem = ({ item }) => (
    <View style={styles.tokenItem}>
      <View style={styles.tokenLeft}>
        {item.logoURI ? (
          <Image 
            source={{ uri: item.logoURI }} 
            style={styles.tokenLogo}
            defaultSource={require('../../assets/icon.png')}
          />
        ) : (
          <View style={[styles.tokenLogo, styles.tokenLogoPlaceholder]}>
            <Text style={styles.tokenLogoText}>{item.symbol.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.tokenDetails}>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
          <Text style={styles.tokenName}>{item.name}</Text>
        </View>
      </View>
      <View style={styles.tokenRight}>
        <Text style={styles.tokenAmount}>${item.value.toFixed(2)}</Text>
        <Text style={styles.tokenBalance}>{item.balance.toFixed(4)} {item.symbol}</Text>
        <Text style={[
          styles.tokenPercentage,
          { color: item.percentage > 0 ? '#4CAF50' : '#FF4444' }
        ]}>
          {item.percentage.toFixed(2)}%
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6A5ACD" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={[styles.actionButton, styles.retryButton]} 
          onPress={fetchWalletData}
        >
          <Text style={styles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <LinearGradient
          colors={['#6A5ACD', '#0E0E1B']}
          style={styles.header}
        >
          <View style={styles.profileSection}>
            <Image
              style={styles.profileImage}
            />
            <Text style={styles.walletAddress}>
              {`${testWalletAddress.slice(0, 6)}...${testWalletAddress.slice(-4)}`}
            </Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={copyToClipboard}
            >
              <Text style={styles.copyButtonText}>Copy Address</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Receive</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Token Holdings</Text>
            <TouchableOpacity onPress={fetchWalletData}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={tokens}
            renderItem={renderTokenItem}
            keyExtractor={(item) => item.address}
            style={styles.tokenList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E1B',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  retryButton: {
    marginTop: 20,
    width: 120,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshText: {
    color: '#6A5ACD',
    fontSize: 14,
    fontWeight: '600',
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
    flex: 1,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
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
  tokenDetails: {
    flex: 1,
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
    marginBottom: 4,
  },
  tokenBalance: {
    fontSize: 14,
    color: '#8C8CA1',
    marginBottom: 4,
  },
  tokenPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ProfileScreen; 