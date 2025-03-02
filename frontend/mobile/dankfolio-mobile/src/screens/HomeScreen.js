import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { generateWallet, getKeypairFromPrivateKey, secureStorage } from '../utils/solanaWallet';
import api from '../services/api';
import { TEST_PRIVATE_KEY } from '@env';

const HomeScreen = ({ navigation }) => {
  const [wallet, setWallet] = useState(null);
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    // Check if a wallet already exists
    const checkWallet = async () => {
      try {
        const savedWallet = await secureStorage.getWallet();
        if (savedWallet) {
          setWallet(savedWallet);
        }
      } catch (error) {
        console.error('Error loading wallet:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkWallet();
  }, []);

  const handleCreateWallet = async () => {
    try {
      setIsLoading(true);
      // Generate a new wallet locally
      const newWallet = generateWallet();
      
      // Save to secure storage
      await secureStorage.saveWallet(newWallet);
      
      setWallet(newWallet);
      Alert.alert(
        'Wallet Created', 
        'Your new wallet has been created. Please make sure to securely save your private key.\n\nPrivate Key: ' + newWallet.privateKey
      );
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Error', 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    try {
      if (!privateKey.trim()) {
        Alert.alert('Error', 'Please enter a private key');
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
        
        Alert.alert('Success', 'Wallet imported successfully');
      } catch (error) {
        Alert.alert('Error', 'Invalid private key format');
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      Alert.alert('Error', 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await secureStorage.deleteWallet();
      setWallet(null);
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out');
    }
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
      <View style={styles.header}>
        <Text style={styles.title}>🚀 DankFolio</Text>
        <Text style={styles.subtitle}>Trade memes securely</Text>
      </View>

      {wallet ? (
        <View style={styles.walletContainer}>
          <Text style={styles.walletTitle}>Your Wallet</Text>
          <Text style={styles.label}>Public Key:</Text>
          <Text style={styles.value} selectable>{wallet.publicKey}</Text>
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.tradeButton}
              onPress={() => navigation.navigate('Trade', { wallet })}
            >
              <Text style={styles.buttonText}>Trade Memes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={styles.buttonText}>Trade History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
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
  walletContainer: {
    padding: 20,
    marginHorizontal: 16,
    backgroundColor: '#262640',
    borderRadius: 12,
    marginTop: 20,
  },
  walletTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#9F9FD5',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#3A3A5A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  buttonsContainer: {
    marginTop: 10,
  },
  tradeButton: {
    backgroundColor: '#6A5ACD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  historyButton: {
    backgroundColor: '#4A4A8A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  authButtonsContainer: {
    marginTop: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#6A5ACD',
  },
  importOptionButton: {
    backgroundColor: '#4A4A8A',
  },
  importContainer: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 20,
  },
  importTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#3A3A5A',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  importButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#5A5A7A',
    flex: 1,
    marginRight: 8,
  },
  importButton: {
    backgroundColor: '#6A5ACD',
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testWalletBanner: {
    backgroundColor: '#48426D',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6A5ACD',
  },
  testWalletTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  testWalletText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  testWalletButton: {
    backgroundColor: '#6A5ACD',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  testWalletButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default HomeScreen; 