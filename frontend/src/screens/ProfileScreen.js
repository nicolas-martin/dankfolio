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
  Alert,
  Platform
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import SolscanWalletService from '../services/WalletService.js';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { formatNumber, formatPrice, formatPercentage } from '../utils/numberFormat';

const { width } = Dimensions.get('window');

const PLACEHOLDER_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    balance: 0,
    value: 0,
    percentage: 0,
    address: '11111111111111111111111111111111',
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    balance: 0,
    value: 0,
    percentage: 0,
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  }
];

const ProfileScreen = ({ route, navigation }) => {
  const [tokens, setTokens] = useState(PLACEHOLDER_TOKENS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isPlaceholder, setIsPlaceholder] = useState(true);

  const walletService = new SolscanWalletService();
  const walletAddress = route.params?.walletAddress;

  useEffect(() => {
    if (!walletAddress) {
      navigation.goBack();
      Alert.alert('Error', 'No wallet address provided');
      return;
    }
    fetchWalletData();
  }, [walletAddress]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const tokenData = await walletService.getTokens(walletAddress);
      
      if (!tokenData || tokenData.length === 0) {
        throw new Error('No tokens found');
      }

      setTokens(tokenData);
      const total = tokenData.reduce((sum, token) => sum + token.value, 0);
      setTotalBalance(total);
      setError(null);
      setIsPlaceholder(false);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to load wallet data');
      // Show placeholder data
      setTokens(PLACEHOLDER_TOKENS);
      setTotalBalance(0);
      setIsPlaceholder(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      Clipboard.setString(walletAddress);
      Alert.alert('Success', 'Wallet address copied to clipboard');
    } catch (err) {
      Alert.alert('Error', 'Failed to copy wallet address');
    }
  };

  const renderTokenItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.tokenItem,
        isPlaceholder && styles.placeholderItem
      ]}
      onPress={() => {/* TODO: Navigate to token details */}}
      activeOpacity={0.7}
    >
      <View style={styles.tokenLeft}>
        {item.logoURI ? (
          <Image 
            source={{ uri: item.logoURI }} 
            style={[
              styles.tokenLogo,
              isPlaceholder && styles.placeholderImage
            ]}
            defaultSource={require('../../assets/icon.png')}
          />
        ) : (
          <View style={[styles.tokenLogo, styles.tokenLogoPlaceholder]}>
            <Text style={styles.tokenLogoText}>{item.symbol.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.tokenDetails}>
          <Text style={[
            styles.tokenSymbol,
            isPlaceholder && styles.placeholderText
          ]}>{item.symbol}</Text>
          <Text style={[
            styles.tokenName,
            isPlaceholder && styles.placeholderText
          ]}>{item.name}</Text>
        </View>
      </View>
      <View style={styles.tokenRight}>
        <Text style={[
          styles.tokenAmount,
          isPlaceholder && styles.placeholderText
        ]}>{formatPrice(item.value)}</Text>
        <Text style={[
          styles.tokenBalance,
          isPlaceholder && styles.placeholderText
        ]}>{formatNumber(item.balance, false, 4)} {item.symbol}</Text>
        <View style={[
          styles.percentageContainer,
          { backgroundColor: item.percentage > 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)' },
          isPlaceholder && styles.placeholderPercentage
        ]}>
          <Text style={[
            styles.tokenPercentage,
            { color: item.percentage > 0 ? '#4CAF50' : '#FF4444' },
            isPlaceholder && styles.placeholderText
          ]}>
            {formatPercentage(item.percentage)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6A5ACD" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6A5ACD', '#483D8B', '#0E0E1B']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back-ios" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImagePlaceholder}>
                <FontAwesome5 name="user-astronaut" size={32} color="#6A5ACD" />
              </View>
            </View>
            <Text style={styles.walletAddress}>
              {`${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`}
            </Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={copyToClipboard}
            >
              <MaterialIcons name="content-copy" size={14} color="#6A5ACD" style={styles.copyIcon} />
              <Text style={styles.copyButtonText}>Copy Address</Text>
            </TouchableOpacity>
            {isPlaceholder && (
              <View style={styles.placeholderBanner}>
                <MaterialIcons name="error-outline" size={16} color="#FF4444" />
                <Text style={styles.placeholderBannerText}>{error}</Text>
                <TouchableOpacity onPress={fetchWalletData}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="send" size={20} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="call-received" size={20} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>Receive</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Token Holdings</Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={fetchWalletData}
            >
              <MaterialIcons name="refresh" size={18} color="#6A5ACD" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={tokens}
            renderItem={renderTokenItem}
            keyExtractor={(item) => item.address}
            style={styles.tokenList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tokenListContent}
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
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 16,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#6A5ACD',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    padding: 3,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6A5ACD',
  },
  walletAddress: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(106, 90, 205, 0.15)',
    borderRadius: 12,
  },
  copyIcon: {
    marginRight: 6,
  },
  copyButtonText: {
    color: '#6A5ACD',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8C8CA1',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#6A5ACD',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6A5ACD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  refreshText: {
    color: '#6A5ACD',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  tokenList: {
    paddingBottom: 20,
  },
  tokenListContent: {
    gap: 12,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  tokenLogoPlaceholder: {
    backgroundColor: 'rgba(106, 90, 205, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.3)',
  },
  tokenLogoText: {
    color: '#6A5ACD',
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
    marginBottom: 4,
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
  percentageContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tokenPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderItem: {
    opacity: 0.7,
  },
  placeholderImage: {
    opacity: 0.5,
  },
  placeholderText: {
    color: '#8C8CA1',
  },
  placeholderPercentage: {
    backgroundColor: 'rgba(140, 140, 161, 0.1)',
  },
  placeholderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  placeholderBannerText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 12,
  },
  retryText: {
    color: '#6A5ACD',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default ProfileScreen; 