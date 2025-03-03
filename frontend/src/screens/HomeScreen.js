import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  FlatList
} from 'react-native';
import { generateWallet, getKeypairFromPrivateKey, secureStorage } from '../utils/solanaWallet';
import api from '../services/api';
import { TEST_PRIVATE_KEY } from '@env';
import CoinCard from '../components/CoinCard';

const HomeScreen = ({ navigation }) => {
  const [wallet, setWallet] = useState(null);
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [coins, setCoins] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [totalBalanceUsd, setTotalBalanceUsd] = useState('0.00');
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);

  useEffect(() => {
    // Check if a wallet already exists and fetch coins
    const initializeData = async () => {
      try {
        setIsLoading(true);
        const savedWallet = await secureStorage.getWallet();
        if (savedWallet) {
          setWallet(savedWallet);
          // Fetch wallet balance
          await fetchWalletBalance(savedWallet.publicKey);
        }
        // Fetch available coins regardless of wallet status
        await fetchAvailableCoins();
      } catch (error) {
        console.error('Error initializing data:', error);
        showNotification('error', 'Failed to load initial data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchAvailableCoins = async () => {
    try {
      setIsLoadingCoins(true);
      const coinsData = await api.getAvailableCoins();
      if (Array.isArray(coinsData) && coinsData.length > 0) {
        setCoins(coinsData);
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
      showNotification('error', 'Failed to fetch available coins');
    } finally {
      setIsLoadingCoins(false);
    }
  };

  const handleCreateWallet = async () => {
    try {
      setIsLoading(true);
      const newWallet = await api.createWallet();

      if (!newWallet || !newWallet.public_key || !newWallet.private_key) {
        throw new Error('Invalid wallet data received from server');
      }

      // Format wallet for storage
      const walletData = {
        publicKey: newWallet.public_key,
        privateKey: newWallet.private_key,
      };

      // Save to secure storage
      await secureStorage.saveWallet(walletData);

      setWallet(walletData);
      fetchWalletBalance(walletData.publicKey);
      await fetchAvailableCoins(); // Refresh coins after wallet creation

      showNotification('success', 'Your new wallet has been created. Please make sure to securely save your private key.');
    } catch (error) {
      console.error('Error creating wallet:', error);
      showNotification('error', 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    try {
      if (!privateKey.trim()) {
        showNotification('error', 'Please enter a private key');
        return;
      }

      setIsLoading(true);

      // Validate private key
      try {
        const keypair = getKeypairFromPrivateKey(privateKey);
        const importedWallet = {
          publicKey: keypair.publicKey.toString(),
          privateKey: privateKey,
        };

        // Save to secure storage
        await secureStorage.saveWallet(importedWallet);

        setWallet(importedWallet);
        setShowImport(false);
        setPrivateKey('');
        await fetchAvailableCoins(); // Refresh coins after wallet import

        showNotification('success', 'Wallet imported successfully');
      } catch (error) {
        showNotification('error', 'Invalid private key format');
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      showNotification('error', 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await secureStorage.deleteWallet();
      setWallet(null);
      setCoins([]); // Clear coins on logout
    } catch (error) {
      console.error('Error logging out:', error);
      showNotification('error', 'Failed to log out');
    }
  };

  const handleCoinPress = (coin) => {
    navigation.navigate('CoinDetail', { coin });
  };

  // Simple notification system to replace Alert.alert
  const [notification, setNotification] = useState({
    visible: false,
    type: 'info', // success, error, info, warning
    message: '',
  });

  const showNotification = (type, message) => {
    setNotification({
      visible: true,
      type,
      message,
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification({
        visible: false,
        type: 'info',
        message: '',
      });
    }, 3000);
  };

  // Simple notification component
  const Notification = () => {
    if (!notification.visible) return null;

    const bgColor = notification.type === 'success'
      ? '#4CAF50'
      : notification.type === 'error'
        ? '#F44336'
        : notification.type === 'warning'
          ? '#FF9800'
          : '#2196F3';

    return (
      <TouchableOpacity
        style={[styles.notification, { backgroundColor: bgColor }]}
        onPress={() => setNotification({ ...notification, visible: false })}
      >
        <Text style={styles.notificationText}>{notification.message}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Notification />

      <View style={styles.header}>
        <Text style={styles.title}>🚀 DankFolio</Text>
        <Text style={styles.subtitle}>Trade memes securely</Text>
      </View>

      {wallet ? (
        <View style={styles.content}>
          {/* Wallet info card */}
          <View style={styles.walletCard}>
            <Text style={styles.walletTitle}>Your Wallet</Text>
            <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
              {wallet.publicKey}
            </Text>

            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceValue}>${totalBalanceUsd}</Text>
            </View>

            {walletBalance && walletBalance.coins && (
              <View style={styles.coinBalances}>
                {walletBalance.coins.map((coin, index) => (
                  <View key={index} style={styles.coinBalanceItem}>
                    <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                    <Text style={styles.coinAmount}>{coin.balance.toFixed(4)}</Text>
                    <Text style={styles.coinValue}>${coin.usd_value.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => fetchWalletBalance(wallet.publicKey)}
            >
              <Text style={styles.refreshButtonText}>🔄 Refresh Balance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Available Coins Section */}
          <View style={styles.coinsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Coins</Text>
              <TouchableOpacity
                onPress={fetchAvailableCoins}
                style={styles.refreshCoinsButton}
              >
                <Text style={styles.refreshCoinsText}>🔄</Text>
              </TouchableOpacity>
            </View>

            {isLoadingCoins ? (
              <ActivityIndicator size="small" color="#6A5ACD" style={styles.coinsLoader} />
            ) : coins.length > 0 ? (
              <FlatList
                data={coins}
                keyExtractor={(item) => item.id || item.symbol}
                renderItem={({ item }) => (
                  <CoinCard
                    coin={item}
                    onPress={() => handleCoinPress(item)}
                  />
                )}
                contentContainerStyle={styles.coinsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noCoinsContainer}>
                <Text style={styles.noCoinsText}>No coins available for trading</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.authContainer}>
          {showImport ? (
            <View style={styles.importContainer}>
              <Text style={styles.importTitle}>Import Wallet</Text>

              <View style={styles.testWalletBanner}>
                <Text style={styles.testWalletTitle}>🧪 Testing Mode 🧪</Text>
                <Text style={styles.testWalletText}>
                  A test wallet is available for development.
                </Text>
                <TouchableOpacity
                  style={styles.testWalletButton}
                  onPress={() => setPrivateKey(TEST_PRIVATE_KEY)}
                >
                  <Text style={styles.testWalletButtonText}>Use Test Wallet</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Enter your private key"
                placeholderTextColor="#999"
                value={privateKey}
                onChangeText={setPrivateKey}
                secureTextEntry
              />

              <View style={styles.importButtonsRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowImport(false);
                    setPrivateKey('');
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.importButton]}
                  onPress={handleImportWallet}
                >
                  <Text style={styles.buttonText}>Import</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.authButtonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreateWallet}
              >
                <Text style={styles.buttonText}>Create New Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.importOptionButton]}
                onPress={() => setShowImport(true)}
              >
                <Text style={styles.buttonText}>Import Existing Wallet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9F9FD5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  walletCard: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  walletAddress: {
    color: '#9F9FD5',
    fontSize: 14,
    marginBottom: 16,
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#9F9FD5',
    fontSize: 14,
    marginBottom: 4,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  coinBalances: {
    marginBottom: 16,
  },
  coinBalanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  coinSymbol: {
    color: '#9F9FD5',
    fontSize: 14,
  },
  coinAmount: {
    color: '#fff',
    fontSize: 14,
  },
  coinValue: {
    color: '#fff',
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  coinsSection: {
    flex: 1,
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionAction: {
    color: '#6A5ACD',
    fontSize: 16,
    fontWeight: '500',
  },
  coinsList: {
    paddingBottom: 20,
  },
  notification: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 100,
  },
  notificationText: {
    color: '#fff',
    textAlign: 'center',
  },
  authContainer: {
    padding: 20,
    marginHorizontal: 16,
    backgroundColor: '#262640',
    borderRadius: 12,
    marginTop: 20,
  },
  authButtonsContainer: {
    marginTop: 20,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#6A5ACD',
  },
  importOptionButton: {
    backgroundColor: '#3B3B5E',
  },
  importContainer: {
    marginVertical: 16,
  },
  importTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#3B3B5E',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
  },
  importButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    flex: 1,
    marginRight: 8,
  },
  importButton: {
    backgroundColor: '#6A5ACD',
    flex: 1,
    marginLeft: 8,
  },
  testWalletBanner: {
    backgroundColor: '#3B3B5E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  testWalletTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testWalletText: {
    color: '#9F9FD5',
    marginBottom: 12,
  },
  testWalletButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  testWalletButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  coinsLoader: {
    marginTop: 20,
  },
  noCoinsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  noCoinsText: {
    color: '#9F9FD5',
    fontSize: 16,
  },
  refreshCoinsButton: {
    padding: 8,
  },
  refreshCoinsText: {
    fontSize: 20,
  },
});

export default HomeScreen; 
