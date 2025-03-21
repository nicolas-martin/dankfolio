import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Coin } from '../../types/index';
import { styles } from './styles';
import { HomeScreenProps } from './types';
import CoinCard from '../../components/trade/CoinCard';
import { useToast } from '../../components/common/Toast';
import { theme } from '../../utils/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WalletBalanceResponse } from '../../services/api';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [coins, setCoins] = useState<Coin[]>([]);
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [walletBalance, setWalletBalance] = useState<WalletBalanceResponse | null>(null);
    const [solCoin, setSolCoin] = useState<Coin | null>(null);
    const { showToast } = useToast();

    const loadCoins = async () => {
        try {
            setIsLoading(true);
            // TODO: Implement fetchCoins from API
            const fetchedCoins = [];
            setCoins(fetchedCoins);
        } catch (error) {
            showToast({ message: 'Error loading coins', type: 'error' });
            console.error('Error loading coins:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCoins();
    }, []);

    const handleCoinPress = (coin: Coin) => {
        navigation.navigate('CoinDetail', { coin });
    };

    const handleProfilePress = () => {
        navigation.navigate('Profile');
    };

    if (isLoading && coins.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>DankFolio</Text>
                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => navigation.navigate('Profile', {
                        walletBalance,
                        walletAddress,
                        solCoin: solCoin
                    })}
                >
                    <MaterialIcons name="account-circle" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <TouchableOpacity
                    style={styles.searchInput}
                    onPress={loadCoins}
                >
                    <Text style={{ color: theme.colors.textSecondary }}>Search coins...</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <Text style={styles.sectionHeader}>Available Coins</Text>
                <ScrollView>
                    {coins.map((coin) => (
                        <CoinCard
                            key={coin.id}
                            coin={coin}
                            onPress={() => handleCoinPress(coin)}
                        />
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

export default HomeScreen; 