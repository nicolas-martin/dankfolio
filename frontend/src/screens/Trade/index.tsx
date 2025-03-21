import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { styles } from './styles';
import { TradeScreenProps } from './types';
import BackButton from '../../components/common/ui/BackButton';
import { useToast } from '../../components/common/Toast';
import { theme } from '../../utils/theme';

const TradeScreen: React.FC<TradeScreenProps> = ({ navigation, route }) => {
    const { coin, isBuy } = route.params;
    const [amount, setAmount] = useState('');
    const { showToast } = useToast();

    const handleTrade = async () => {
        try {
            if (!amount || isNaN(Number(amount))) {
                showToast({ message: 'Please enter a valid amount', type: 'warning' });
                return;
            }

            // TODO: Implement trade logic
            showToast({ message: `${isBuy ? 'Bought' : 'Sold'} ${amount} ${coin.symbol}`, type: 'success' });
            navigation.goBack();
        } catch (error) {
            showToast({ message: 'Trade failed', type: 'error' });
            console.error('Trade error:', error);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.tradeContainer}>
                <View style={styles.header}>
                    <BackButton />
                    <Text style={styles.headerText}>
                        {isBuy ? 'Buy' : 'Sell'} {coin.symbol}
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter amount..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        autoFocus
                    />
                    <View style={styles.valueContainer}>
                        <Text style={styles.valueText}>
                            ≈ ${(Number(amount) * coin.price).toFixed(2)}
                        </Text>
                        <Text style={styles.priceText}>
                            1 {coin.symbol} = ${coin.price.toFixed(2)}
                        </Text>
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tradeButton,
                            (!amount || isNaN(Number(amount))) && styles.disabledButton
                        ]}
                        onPress={handleTrade}
                        disabled={!amount || isNaN(Number(amount))}
                    >
                        <Text style={styles.tradeButtonText}>
                            {isBuy ? 'Buy' : 'Sell'} {coin.symbol}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default TradeScreen; 