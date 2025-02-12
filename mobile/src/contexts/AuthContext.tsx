import React, { createContext, useState, useContext, useEffect } from 'react';
import { SecureStore } from '../utils/secureStore';
import { authService } from '../services/authService';
import { walletService } from '../services/walletService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (provider: 'google' | 'apple' | 'facebook') => Promise<void>;
  logout: () => Promise<void>;
  wallet: {
    address: string | null;
    balance: number | null;
    createWallet: () => Promise<void>;
    refreshBalance: () => Promise<void>;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await SecureStore.getItem('authToken');
      if (token) {
        const userData = await authService.validateToken(token);
        setUser(userData);
        await loadWalletData();
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletData = async () => {
    const address = await SecureStore.getItem('walletPublicKey');
    if (address) {
      setWalletAddress(address);
      const balance = await walletService.getBalance(address);
      setWalletBalance(balance);
    }
  };

  const login = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      setLoading(true);
      const { user, token } = await authService.socialLogin(provider);
      await SecureStore.setItem('authToken', token);
      setUser(user);
      await loadWalletData();
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.removeItem('authToken');
      await SecureStore.removeItem('walletPublicKey');
      setUser(null);
      setWalletAddress(null);
      setWalletBalance(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const createWallet = async () => {
    try {
      const { publicKey } = await walletService.createWallet();
      setWalletAddress(publicKey);
      await loadWalletData();
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        wallet: {
          address: walletAddress,
          balance: walletBalance,
          createWallet,
          refreshBalance: loadWalletData,
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 