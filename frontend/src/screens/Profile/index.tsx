import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styles } from './styles';
import { ProfileScreenProps } from './types';
import BackButton from '../../components/common/ui/BackButton';
import TokenCard from '../../components/profile/TokenCard'
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/index';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC<ProfileScreenProps> = ({ route }) => {
    const navigation = useNavigation<ProfileScreenNavigationProp>();
    const { walletAddress, walletBalance, solCoin } = route.params;
    
    // Calculate total value including SOL
    const tokenValue = walletBalance.tokens.reduce((sum, token) => sum + token.value, 0);
    const solValue = walletBalance.sol_balance * (solCoin?.price || 0);
    const totalValue = tokenValue + solValue;

    const handleTokenPress = (token: any) => {
        if (!token.id) {
            console.error('❌ No token ID available for:', token.symbol);
            return;
        }

        navigation.navigate('CoinDetail', {
            coinId: token.id,
            coinName: token.name,
            coin: token,
            solCoin: solCoin,
            walletBalance: walletBalance
        });
    };

    return (
        <View style={[styles.container, { paddingTop: 16 }]}>
            <BackButton />

            <ScrollView>
                <View style={styles.portfolioCard}>
                    <Text style={styles.portfolioTitle}>Portfolio Value</Text>
                    <Text style={styles.portfolioValue}>
                        ${totalValue.toFixed(4)}
                    </Text>
                    {solCoin && (
                        <Text
                            style={[
                                styles.portfolioChange,
                                solCoin.percentage >= 0 ? styles.positive : styles.negative,
                            ]}
                        >
                            {solCoin.percentage >= 0 ? '+' : ''}
                            {solCoin.percentage.toFixed(2)}% (24h)
                        </Text>
                    )}
                </View>

                {solCoin && (
                    <TokenCard
                        key={solCoin.id}
                        token={solCoin}
                        balance={walletBalance.sol_balance}
                        onPress={() => handleTokenPress(solCoin)}
                    />
                )}

                {walletBalance.tokens.map((token) => (
                    <TokenCard
                        key={token.id}
                        token={token}
                        balance={token.balance}
                        onPress={() => handleTokenPress(token)}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

export default ProfileScreen;