import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, FlatList, Image } from 'react-native';
import { getKeypairFromPrivateKey, secureStorage } from '../utils/solanaWallet';
import api from '../services/api';
import { TEST_PRIVATE_KEY } from '@env';
import CoinCard from '../components/CoinCard';
import { Wallet, Coin, NotificationProps, ScreenProps } from '../types/index';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/index';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Notification: React.FC<NotificationProps> = ({ visible, type, message, onDismiss }) => {
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

interface NotificationState {
  visible: boolean;
  type: NotificationProps['type'];
  message: string;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  // Wallet and coin states
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>([]);

  // Notification state
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    type: 'info',
    message: '',
  });

  const showNotification = (type: NotificationProps['type'], message: string): void => {
    setNotification({ visible: true, type, message });
    setTimeout(() => setNotification({ visible: false, type: 'info', message: '' }), 3000);
  };

  const fetchAvailableCoins = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const coinsData = await api.getAvailableCoins();
      if (Array.isArray(coinsData) && coinsData.length > 0) {
        setCoins(coinsData);
      } else {
        console.log('⚠️ No coins received or empty array');
      }
    } catch (err) {
      console.error('❌ Error fetching coins:', err);
      showNotification('error', 'Failed to fetch available coins');
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const savedWallet = await secureStorage.getWallet();
      if (savedWallet) {
        setWallet(savedWallet);
      }
      await fetchAvailableCoins();
    } catch (err) {
      console.error('Error initializing data:', err);
      showNotification('error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  }, [fetchAvailableCoins]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const handleCreateWallet = async (): Promise<void> => {
    try {
      const newWallet = await api.createWallet();
      setWallet({
        address: newWallet.address,
        privateKey: newWallet.private_key,
        balance: 0
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  const handleImportWallet = async (privateKey: string) => {
    try {
      const keypair = getKeypairFromPrivateKey(privateKey);
      const walletData: Wallet = {
        address: keypair.publicKey.toString(),
        privateKey: privateKey,
        balance: 0
      };
      setWallet(walletData);
    } catch (error) {
      console.error('Error importing wallet:', error);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await secureStorage.deleteWallet();
      setWallet(null);
      setCoins([]);
    } catch (err) {
      console.error('Error logging out:', err);
      showNotification('error', 'Failed to log out');
    }
  };

  const handleCoinPress = (coin: Coin) => {
    navigation.navigate('CoinDetail', {
      coinId: coin.id,
      coinName: coin.name
    } satisfies RootStackParamList['CoinDetail']);
  };

  const loadCoins = async (): Promise<void> => {
    try {
      await fetchAvailableCoins();
    } catch (err) {
      console.error('Error loading coins:', err);
    }
  };

  const onRefresh = (): void => {
    loadCoins();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
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
              {wallet.address}
            </Text>
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
            {coins.length > 0 ? (
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
          <View style={styles.profileContainer}>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile', {})}
            >
              <Text style={styles.profileButtonText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.walletActions}>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateWallet}>
              <Text style={styles.buttonText}>Create New Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.importButton}
              onPress={() => setPrivateKey(TEST_PRIVATE_KEY)}
            >
              <Text style={styles.buttonText}>Import Wallet</Text>
            </TouchableOpacity>
          </View>

          {privateKey && (
            <View style={styles.importForm}>
              <View style={styles.testWalletBanner}>
                <Text style={styles.testWalletTitle}>🧪 Testing Mode 🧪</Text>
                <Text style={styles.testWalletText}>
                  A test wallet is available for development.
                </Text>
                <TouchableOpacity
                  style={styles.testWalletButton}
                  onPress={() => handleImportWallet(privateKey)}
                >
                  <Text style={styles.testWalletButtonText}>Use Test Wallet</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Enter your private key"
                placeholderTextColor="#666"
                value={privateKey}
                onChangeText={setPrivateKey}
                secureTextEntry
              />
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    marginHorizontal: 20,
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
  content: {
    flex: 1,
    padding: 20,
  },
  walletCard: {
    backgroundColor: '#2A2A3E',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  walletAddress: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15,
  },
  logoutButton: {
    backgroundColor: '#6A5ACD',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  coinsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshCoinsButton: {
    padding: 5,
  },
  refreshCoinsText: {
    fontSize: 20,
  },
  coinsList: {
    paddingBottom: 20,
  },
  noCoinsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCoinsText: {
    color: '#888',
    fontSize: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  profileButton: {
    backgroundColor: '#6A5ACD',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#6A5ACD',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  importButton: {
    flex: 1,
    backgroundColor: '#6A5ACD',
    padding: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  importForm: {
    marginTop: 20,
  },
  input: {
    backgroundColor: '#2A2A3E',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  notification: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    zIndex: 1000,
  },
  notificationText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  testWalletBanner: {
    backgroundColor: '#2A2A3E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  testWalletTitle: {
    color: '#FFFFFF',
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
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  testWalletButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default HomeScreen; 