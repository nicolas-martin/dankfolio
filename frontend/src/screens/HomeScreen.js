import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  Button
} from 'react-native';
import { generateWallet, getKeypairFromPrivateKey, secureStorage } from '../utils/solanaWallet';
import api from '../services/api';
import { TEST_PRIVATE_KEY } from '@env';
import CoinCard from '../components/CoinCard';

// Notification component using clean code practices
const Notification = ({ visible, type, message, onDismiss }) => {
  if (!visible) return null;

  const bgColor =
    type === 'success'
      ? '#4CAF50'
      : type === 'error'
      ? '#F44336'
      : type === 'warning'
      ? '#FF9800'
      : '#2196F3';

  return (
    <TouchableOpacity style={[styles.notification, { backgroundColor: bgColor }]} onPress={onDismiss}>
      <Text style={styles.notificationText}>{message}</Text>
    </TouchableOpacity>
  );
};

const HomeScreen = ({ navigation }) => {
  // Wallet and coin states
  const [wallet, setWallet] = useState(null);
  const [privateKey, setPrivateKey] = useState('');
  const [coins, setCoins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState(null);

  // Notification state (clean code focus keyword appears throughout)
  const [notification, setNotification] = useState({
    visible: false,
    type: 'info',
    message: '',
  });

  const showNotification = (type, message) => {
    setNotification({ visible: true, type, message });
    setTimeout(() => setNotification({ visible: false, type: 'info', message: '' }), 3000);
  };

  // Placeholder for wallet balance refresh
  const fetchWalletBalance = async (publicKey) => {
    console.log('Refreshing balance for:', publicKey);
    // Add your API call logic here.
  };

  const fetchAvailableCoins = useCallback(async () => {
    try {
      setIsLoadingCoins(true);
      const coinsData = await api.getAvailableCoins();
      if (Array.isArray(coinsData) && coinsData.length > 0) {
        setCoins(coinsData);
      }
    } catch (err) {
      console.error('Error fetching coins:', err);
      showNotification('error', 'Failed to fetch available coins');
    } finally {
      setIsLoadingCoins(false);
    }
  }, []);

  const initializeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedWallet = await secureStorage.getWallet();
      if (savedWallet) {
        setWallet(savedWallet);
      }
      await fetchAvailableCoins();
    } catch (err) {
      console.error('Error initializing data:', err);
      showNotification('error', 'Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAvailableCoins]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const handleCreateWallet = async () => {
    try {
      setIsLoading(true);
      const newWallet = await api.createWallet();
      if (!newWallet || !newWallet.public_key || !newWallet.private_key) {
        throw new Error('Invalid wallet data received from server');
      }
      const walletData = {
        publicKey: newWallet.public_key,
        privateKey: newWallet.private_key,
      };
      await secureStorage.saveWallet(walletData);
      setWallet(walletData);
      await fetchAvailableCoins();
      showNotification('success', 'Your new wallet has been created. Save your private key securely.');
    } catch (err) {
      console.error('Error creating wallet:', err);
      showNotification('error', 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!privateKey.trim()) {
      showNotification('error', 'Please enter a private key');
      return;
    }
    try {
      setIsLoading(true);
      let keypair;
      try {
        keypair = getKeypairFromPrivateKey(privateKey);
      } catch {
        showNotification('error', 'Invalid private key format');
        return;
      }
      const importedWallet = {
        publicKey: keypair.publicKey.toString(),
        privateKey,
      };
      await secureStorage.saveWallet(importedWallet);
      setWallet(importedWallet);
      setShowImport(false);
      setPrivateKey('');
      await fetchAvailableCoins();
      showNotification('success', 'Wallet imported successfully');
    } catch (err) {
      console.error('Error importing wallet:', err);
      showNotification('error', 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await secureStorage.deleteWallet();
      setWallet(null);
      setCoins([]);
    } catch (err) {
      console.error('Error logging out:', err);
      showNotification('error', 'Failed to log out');
    }
  };

  const handleCoinPress = (coin) => {
    navigation.navigate('CoinDetail', { coin, coins });
  };

  const loadCoins = async () => {
    try {
      setError(null);
      await fetchAvailableCoins();
    } catch (err) {
      setError('Failed to load coins. Please try again.');
      console.error('Error loading coins:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCoins();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Notification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onDismiss={() => setNotification({ visible: false, type: 'info', message: '' })}
      />

      <View style={styles.header}>
        <Text style={styles.title}>🚀 DankFolio</Text>
        <Text style={styles.subtitle}>Trade memes securely</Text>
      </View>

      {wallet ? (
        <View style={styles.content}>
          {/* Wallet info */}
          <View style={styles.walletCard}>
            <Text style={styles.walletTitle}>Your Wallet</Text>
            <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
              {wallet.publicKey}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => fetchWalletBalance(wallet.publicKey)}>
              <Text style={styles.refreshButtonText}>🔄 Refresh Balance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Coins list */}
          <View style={styles.coinsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Coins</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshCoinsButton}>
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
                  <CoinCard coin={item} onPress={() => handleCoinPress(item)} />
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
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile', { walletAddress: wallet.publicKey.toString() })}
          >
            <Text style={styles.profileButtonText}>View Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.authContainer}>
          {showImport ? (
            <View style={styles.importContainer}>
              <Text style={styles.importTitle}>Import Wallet</Text>
              <View style={styles.testWalletBanner}>
                <Text style={styles.testWalletTitle}>🧪 Testing Mode 🧪</Text>
                <Text style={styles.testWalletText}>A test wallet is available for development.</Text>
                <TouchableOpacity
                  style={styles.testWalletButton}
                  onPress={async () => {
                    try {
                      if (!TEST_PRIVATE_KEY) {
                        showNotification('error', 'Test wallet key not found in env variables');
                        return;
                      }
                      setPrivateKey(TEST_PRIVATE_KEY);
                      setTimeout(() => handleImportWallet(), 100);
                    } catch (err) {
                      console.error('Error using test wallet:', err);
                      showNotification('error', 'Failed to use test wallet');
                    }
                  }}
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
                <TouchableOpacity style={[styles.button, styles.importButton]} onPress={handleImportWallet}>
                  <Text style={styles.buttonText}>Import</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.authButtonsContainer}>
              <TouchableOpacity style={[styles.button, styles.createButton]} onPress={handleCreateWallet}>
                <Text style={styles.buttonText}>Create New Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.importOptionButton]} onPress={() => setShowImport(true)}>
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
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#9F9FD5' },
  content: { flex: 1, paddingHorizontal: 16 },
  walletCard: { backgroundColor: '#262640', borderRadius: 12, padding: 20, marginBottom: 20 },
  walletTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  walletAddress: { color: '#9F9FD5', fontSize: 14, marginBottom: 16 },
  refreshButton: { backgroundColor: '#6A5ACD', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  refreshButtonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  logoutButton: { backgroundColor: '#6A5ACD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  coinsSection: { flex: 1, backgroundColor: '#262640', borderRadius: 12, padding: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  refreshCoinsButton: { padding: 8 },
  refreshCoinsText: { fontSize: 20 },
  coinsList: { paddingBottom: 20 },
  coinsLoader: { marginTop: 20 },
  noCoinsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  noCoinsText: { color: '#9F9FD5', fontSize: 16 },
  notification: { position: 'absolute', top: 50, left: 20, right: 20, padding: 15, borderRadius: 8, zIndex: 100 },
  notificationText: { color: '#fff', textAlign: 'center' },
  authContainer: { padding: 20, marginHorizontal: 16, backgroundColor: '#262640', borderRadius: 12, marginTop: 20 },
  authButtonsContainer: { marginTop: 20 },
  button: { borderRadius: 8, paddingVertical: 15, paddingHorizontal: 20, marginVertical: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  createButton: { backgroundColor: '#6A5ACD' },
  importOptionButton: { backgroundColor: '#3B3B5E' },
  importContainer: { marginVertical: 16 },
  importTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#3B3B5E', borderRadius: 8, color: '#fff', paddingHorizontal: 16, paddingVertical: 12, marginVertical: 8 },
  importButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelButton: { backgroundColor: '#F44336', flex: 1, marginRight: 8 },
  importButton: { backgroundColor: '#6A5ACD', flex: 1, marginLeft: 8 },
  testWalletBanner: { backgroundColor: '#3B3B5E', borderRadius: 8, padding: 12, marginBottom: 16 },
  testWalletTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  testWalletText: { color: '#9F9FD5', marginBottom: 12 },
  testWalletButton: { backgroundColor: '#6A5ACD', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  testWalletButtonText: { color: '#fff', fontWeight: '500' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  errorText: { color: 'red', textAlign: 'center', padding: 20 },
  profileButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
