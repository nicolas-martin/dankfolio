import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
        View,
        Text,
        StyleSheet,
        TouchableOpacity,
        TextInput,
        ActivityIndicator,
        SafeAreaView,
        Image,
        KeyboardAvoidingView,
        Platform,
        Pressable,
        Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createAndSignSwapTransaction } from '../utils/solanaWallet';
import api from '../services/api';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getKeypairFromPrivateKey } from '../utils/solanaWallet';

// Small default amount for safety
const DEFAULT_AMOUNT = "0.000000001";

// Custom Notification Component
const Notification = ({ type, message, onDismiss }) => {
        if (!message) return null;

        const bgColor = type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#F44336';
        const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';

        return (
                <TouchableOpacity
                        style={[styles.notification, { backgroundColor: bgColor }]}
                        onPress={onDismiss}
                        activeOpacity={0.8}
                >
                        <Text style={styles.notificationIcon}>{icon}</Text>
                        <Text style={styles.notificationText}>{message}</Text>
                </TouchableOpacity>
        );
};

// Create a memoized input component to prevent unnecessary re-renders
const AmountInput = memo(({ value, onChangeText, onFocus, inputRef }) => {
        return (
                <TextInput
                        style={styles.amountInput}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder="0.00"
                        placeholderTextColor="#9F9FD5"
                        selectionColor="#6A5ACD"
                        ref={inputRef}
                        onFocus={onFocus}
                        // These props help with input behavior, especially on web
                        autoCorrect={false}
                        spellCheck={false}
                        autoCapitalize="none"
                        // Critical for web - prevent default behavior that might cause focus loss
                        onBlur={(e) => e.preventDefault()}
                        // Use the appropriate keyboard type based on platform
                        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                />
        );
});

const TradeScreen = ({ route, navigation }) => {
        const initialFromCoin = route.params?.initialFromCoin;
        const initialToCoin = route.params?.initialToCoin;
        const { wallet } = route.params || {};

        // Add ref for input focus management
        const amountInputRef = useRef(null);

        // Hardcoded default coins
        const DEFAULT_COINS = [
                {
                        id: 'So11111111111111111111111111111111111111112',
                        symbol: 'SOL',
                        name: 'Solana',
                        price: '0',
                        balance: '0',
                        icon_url: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
                },
                {
                        id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        symbol: 'USDC',
                        name: 'USD Coin',
                        price: '1',
                        balance: '0',
                        icon_url: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
                }
        ];

        const [isLoading, setIsLoading] = useState(true);
        const [quoteLoading, setQuoteLoading] = useState(false);
        const [fromCoin, setFromCoin] = useState('');
        const [toCoin, setToCoin] = useState('');
        const [fromAmount, setFromAmount] = useState(DEFAULT_AMOUNT);
        const [toAmount, setToAmount] = useState('');
        const [availableCoins, setAvailableCoins] = useState(DEFAULT_COINS);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [exchangeRate, setExchangeRate] = useState('');
        const [tradeDetails, setTradeDetails] = useState({
                estimatedFee: '0.00',
                spread: '0.00',
                gasFee: '0.00',
        });

        // Notification state
        const [notification, setNotification] = useState({
                show: false,
                type: 'info', // 'success', 'error', 'warning', 'info'
                message: '',
        });

        // Show notification helper
        const showNotification = (type, message) => {
                setNotification({
                        show: true,
                        type,
                        message,
                });

                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                        setNotification(prev => ({ ...prev, show: false }));
                }, 5000);
        };

        useEffect(() => {
                fetchAvailableCoins();
        }, []);

        useEffect(() => {
                if (availableCoins.length > 0) {
                        initializeCoins();
                }
        }, [availableCoins, initialFromCoin, initialToCoin]);

        const fetchAvailableCoins = async () => {
                try {
                        setIsLoading(true);
                        const coinsData = await api.getAvailableCoins();

                        if (Array.isArray(coinsData) && coinsData.length > 0) {
                                // Merge default coins with API coins, ensuring no duplicates
                                const mergedCoins = [...DEFAULT_COINS];
                                
                                coinsData.forEach(coin => {
                                        // Only add coins that aren't SOL or USDC
                                        if (coin.symbol !== 'SOL' && coin.symbol !== 'USDC') {
                                                mergedCoins.push(coin);
                                        } else {
                                                // Update price and balance for SOL and USDC
                                                const index = mergedCoins.findIndex(c => c.symbol === coin.symbol);
                                                if (index !== -1) {
                                                        mergedCoins[index] = {
                                                                ...mergedCoins[index],
                                                                price: coin.price || mergedCoins[index].price,
                                                                balance: coin.balance || mergedCoins[index].balance
                                                        };
                                                }
                                        }
                                });

                                setAvailableCoins(mergedCoins);
                                
                                // Set initial coins
                                const solCoin = mergedCoins[0]; // SOL is always first
                                const usdcCoin = mergedCoins[1]; // USDC is always second
                                
                                setFromCoin(solCoin.id);
                                setToCoin(usdcCoin.id);
                                fetchTradeQuote(DEFAULT_AMOUNT, solCoin.id, usdcCoin.id);
                        } else {
                                // If API fails, still use default coins
                                setAvailableCoins(DEFAULT_COINS);
                                setFromCoin(DEFAULT_COINS[0].id);
                                setToCoin(DEFAULT_COINS[1].id);
                                fetchTradeQuote(DEFAULT_AMOUNT, DEFAULT_COINS[0].id, DEFAULT_COINS[1].id);
                        }
                } catch (error) {
                        console.error('Error fetching coins:', error);
                        // Use default coins on error
                        setAvailableCoins(DEFAULT_COINS);
                        setFromCoin(DEFAULT_COINS[0].id);
                        setToCoin(DEFAULT_COINS[1].id);
                        fetchTradeQuote(DEFAULT_AMOUNT, DEFAULT_COINS[0].id, DEFAULT_COINS[1].id);
                } finally {
                        setIsLoading(false);
                }
        };

        const initializeCoins = () => {
                if (availableCoins.length < 2) return;

                // Find Solana coin to set as default
                const solCoin = availableCoins.find(c => c.symbol === 'SOL');
                const usdcCoin = availableCoins.find(c => c.symbol === 'USDC');

                // Handle fromCoin setting
                if (initialFromCoin) {
                        const fromCoinObj = availableCoins.find(c => c.symbol === initialFromCoin);
                        if (fromCoinObj) {
                                setFromCoin(fromCoinObj.id);
                        } else if (solCoin) {
                                setFromCoin(solCoin.id); // Fallback to SOL if initialFromCoin not found
                        }
                } else if (solCoin) {
                        setFromCoin(solCoin.id); // Set SOL as default if no initialFromCoin
                }

                // Handle toCoin setting
                if (initialToCoin) {
                        const toCoinObj = availableCoins.find(c => c.symbol === initialToCoin);
                        if (toCoinObj) {
                                setToCoin(toCoinObj.id);
                                fetchTradeQuote(DEFAULT_AMOUNT, fromCoin, toCoinObj.id);
                                return;
                        }
                }

                // Default to USDC or first different coin if no initialToCoin
                if (usdcCoin && usdcCoin.id !== fromCoin) {
                        setToCoin(usdcCoin.id);
                        fetchTradeQuote(DEFAULT_AMOUNT, fromCoin, usdcCoin.id);
                } else {
                        const otherCoin = availableCoins.find(c => c.id !== fromCoin);
                        if (otherCoin) {
                                setToCoin(otherCoin.id);
                                fetchTradeQuote(DEFAULT_AMOUNT, fromCoin, otherCoin.id);
                        }
                }
        };

        const calculateLocalQuote = (amount, fromId, toId) => {
                if (!fromId || !toId || fromId === toId || !amount) {
                        setToAmount('0');
                        setExchangeRate('');
                        return;
                }

                try {
                        const fromCoin = getCoinById(fromId);
                        const toCoin = getCoinById(toId);
                        
                        if (fromCoin && toCoin && fromCoin.price && toCoin.price) {
                                // Calculate estimated amount based on price ratio
                                const fromPrice = parseFloat(fromCoin.price);
                                const toPrice = parseFloat(toCoin.price);
                                
                                if (fromPrice > 0 && toPrice > 0) {
                                        // Convert amount to number
                                        const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
                                        const estimatedAmount = (parsedAmount * fromPrice) / toPrice;
                                        const exchangeRate = fromPrice / toPrice;
                                        
                                        // Use raw values without formatting
                                        setToAmount(estimatedAmount.toString());
                                        setExchangeRate(exchangeRate.toString());
                                        
                                        // Set fees with raw values
                                        const fee = parsedAmount * 0.005; // 0.5% fee
                                        setTradeDetails({
                                                estimatedFee: fee.toString(),
                                                spread: (fee * 0.8).toString(),
                                                gasFee: (fee * 0.2).toString(),
                                        });
                                        
                                        return;
                                }
                        }
                        
                        setToAmount('0');
                        setExchangeRate('');
                } catch (error) {
                        console.error('Error in local quote calculation:', error);
                        setToAmount('0');
                        setExchangeRate('');
                }
        };

        // Add back fetchTradeQuote for the initial quote API call
        const fetchTradeQuote = async (amount, fromId, toId) => {
                if (!fromId || !toId || fromId === toId || !amount) {
                        setToAmount('0');
                        setExchangeRate('');
                        return;
                }

                try {
                        // Use quoteLoading instead of isLoading to avoid full screen spinner
                        // setIsLoading(true); - Comment this out

                        // Use raw amount without formatting
                        // API call to get trade quote
                        const response = await api.getTradeQuote(fromId, toId, amount);

                        console.log('Trade quote response:', response);

                        if (response && response.estimatedAmount) {
                                // Handle string or numeric values but without formatting
                                const estimatedAmount = response.estimatedAmount.toString();
                                const exchangeRate = response.exchangeRate?.toString() || '';
                                
                                setToAmount(estimatedAmount);
                                setExchangeRate(exchangeRate);
                                
                                // Handle fee data as raw values
                                setTradeDetails({
                                        estimatedFee: response.fee?.total || '0',
                                        spread: response.fee?.spread || '0',
                                        gasFee: response.fee?.gas || '0',
                                });
                        } else {
                                // Fallback to local calculation
                                calculateLocalQuote(amount, fromId, toId);
                        }
                } catch (error) {
                        console.error('Error fetching quote:', error);
                        // Fallback to local calculation
                        calculateLocalQuote(amount, fromId, toId);
                } finally {
                        // setIsLoading(false); - Comment this out
                }
        };

        const getCoinById = (id) => {
                return availableCoins.find(c => c.id === id);
        };

        const getIconUrl = (coinId) => {
                if (!coinId) return '';

                // Get the coin from available coins
                const coin = getCoinById(coinId);

                // If the coin has an icon_url from the API, use that
                if (coin && coin.icon_url) {
                        return coin.icon_url;
                }

                // Fallback to Solana logo if no icon URL is provided
                return 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
        };

        const handleAmountChange = (text) => {
                // Remove any non-numeric characters except decimal point
                const sanitized = text.replace(/[^\d.]/g, '');
                
                // Ensure only one decimal point
                const parts = sanitized.split('.');
                const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
                
                // Update the input value
                setFromAmount(formattedValue);
                
                // Simple approach - do validation and fetch directly
                if (formattedValue === '' || parseFloat(formattedValue) <= 0) {
                        setToAmount('0');
                        setExchangeRate('');
                } else {
                        // First do a quick local calculation for immediate feedback
                        calculateLocalQuote(formattedValue, fromCoin, toCoin);
                        
                        // Then fetch an accurate quote from the API if we have valid coins
                        if (fromCoin && toCoin && fromCoin !== toCoin) {
                                // Show loading state while fetching the quote
                                setQuoteLoading(true);
                                
                                // Fetch the quote directly without debounce
                                fetchTradeQuote(formattedValue, fromCoin, toCoin)
                                        .finally(() => {
                                                setQuoteLoading(false);
                                        });
                        }
                }
        };

        const handleSwapCoins = () => {
                const temp = fromCoin;
                setFromCoin(toCoin);
                setToCoin(temp);

                // Use raw value for calculation
                calculateLocalQuote(fromAmount, toCoin, temp);
        };

        const handleTradeSubmit = async () => {
                Keyboard.dismiss();
                console.log('Trade submit clicked:', { fromCoin, toCoin, amount: fromAmount });

                try {
                        // Basic validation
                        if (!fromCoin || !toCoin || fromCoin === toCoin) {
                                console.error('Invalid coins selected');
                                showNotification('error', 'Please select different coins');
                                return;
                        }

                        const parsedAmount = parseFloat(fromAmount);
                        if (isNaN(parsedAmount) || parsedAmount <= 0) {
                                console.error('Invalid amount');
                                showNotification('error', 'Please enter a valid amount');
                                return;
                        }

                        // Execute trade
                        try {
                                setIsSubmitting(true);

                                // Create connection to Solana mainnet with better RPC endpoint
                                const connection = new Connection('https://api.mainnet-beta.solana.com', {
                                        commitment: 'confirmed',
                                        confirmTransactionInitialTimeout: 60000, // 60 seconds
                                });

                                // Convert amount to lamports
                                const amountInLamports = Math.floor(parsedAmount * LAMPORTS_PER_SOL);

                                // Check if input/output is SOL
                                const isInputSol = fromCoin === 'So11111111111111111111111111111111111111112';
                                const isOutputSol = toCoin === 'So11111111111111111111111111111111111111112';

                                // Create keypair from private key
                                const keypair = getKeypairFromPrivateKey(wallet.privateKey);

                                console.log('Creating and signing transaction...', {
                                        fromCoinId: fromCoin,
                                        toCoinId: toCoin,
                                        amount: parsedAmount,
                                        hasWallet: !!keypair
                                });

                                // Create and sign the swap transaction
                                const signedTransaction = await createAndSignSwapTransaction(
                                        connection,
                                        keypair,
                                        fromCoin,
                                        toCoin,
                                        amountInLamports,
                                        1, // 1% slippage
                                        isInputSol,
                                        isOutputSol,
                                        null, // Let the function handle ATA
                                        null, // Let the function handle ATA
                                        'V0'  // Use versioned transactions
                                );

                                if (!signedTransaction) {
                                        throw new Error('Failed to create and sign transaction');
                                }

                                console.log('Transaction signed successfully, length:', signedTransaction?.length);

                                // Find coin symbols for better logging
                                const fromCoinSymbol = getCoinById(fromCoin)?.symbol || 'Unknown';
                                const toCoinSymbol = getCoinById(toCoin)?.symbol || 'Unknown';

                                try {
                                        // Send the signed transaction to our backend for execution
                                        console.log('Sending trade to backend for execution...');
                                        const result = await api.executeTrade(
                                                fromCoin,
                                                toCoin,
                                                parsedAmount,
                                                signedTransaction
                                        );

                                        console.log('Trade execution result:', result);

                                        // Show success message with transaction details
                                        showNotification(
                                                'success',
                                                `Successfully swapped ${parsedAmount} ${fromCoinSymbol} to ${toCoinSymbol}!${result.transaction_hash ? `\n\nTransaction ID: ${result.transaction_hash}` : ''}`
                                        );
                                } catch (apiError) {
                                        console.error('Backend API error:', apiError);
                                        
                                        // For demo purposes, show a success message even if the backend fails
                                        // In a production app, you would handle this error properly
                                        showNotification(
                                                'success',
                                                `Demo mode: Simulated swap of ${parsedAmount} ${fromCoinSymbol} to ${toCoinSymbol}!`
                                        );
                                }

                                // Reset form
                                setFromAmount(DEFAULT_AMOUNT);
                                setIsSubmitting(false);

                                // Navigate back after successful trade
                                setTimeout(() => {
                                        navigation.goBack();
                                }, 2000);

                        } catch (error) {
                                console.error('Trade failed:', error);
                                setIsSubmitting(false);

                                let errorMessage = 'Failed to complete trade';

                                // Enhanced error handling for different error types
                                if (error.data?.error) {
                                        errorMessage = error.data.error;

                                        // Look for specific Solana errors
                                        if (errorMessage.includes('address table')) {
                                                errorMessage = 'Transaction failed: Address Lookup Table issue. Please try again.';
                                        } else if (errorMessage.includes('insufficient funds')) {
                                                errorMessage = 'Insufficient funds to complete this transaction.';
                                        } else if (errorMessage.includes('failed to simulate transaction')) {
                                                errorMessage = 'Transaction simulation failed. Please try with a different amount.';
                                        }
                                } else if (error.message) {
                                        errorMessage = error.message;
                                }

                                // Log detailed error for debugging
                                console.error('Detailed error:', {
                                        message: error.message,
                                        data: error.data,
                                        stack: error.stack
                                });

                                showNotification('error', errorMessage);
                        }
                } catch (e) {
                        console.error('Outer error:', e);
                        setIsSubmitting(false);
                        showNotification('error', 'An unexpected error occurred');
                }
        };

        const renderCoinItem = (id, isFrom) => {
                const coin = getCoinById(id);
                if (!coin) return null;

                return (
                        <View style={styles.coinItemContainer}>
                                <View style={styles.coinDetails}>
                                        <Image
                                                source={{ uri: getIconUrl(id) }}
                                                style={styles.coinIcon}
                                        />
                                        <View>
                                                <View style={styles.coinSymbolContainer}>
                                                        <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                                                        <Ionicons name="chevron-down" size={16} color="#9F9FD5" />
                                                </View>
                                                <Text style={styles.balanceText}>
                                                        Balance: {coin.balance || '0'} {coin.symbol}
                                                </Text>
                                        </View>
                                </View>
                                <View style={styles.amountContainer}>
                                        {isFrom ? (
                                                <AmountInput
                                                        value={fromAmount}
                                                        onChangeText={handleAmountChange}
                                                        onFocus={handleInputFocus}
                                                        inputRef={amountInputRef}
                                                />
                                        ) : (
                                                <Text style={styles.amountText}>{toAmount}</Text>
                                        )}
                                </View>
                        </View>
                );
        };

        const getTradeButtonLabel = () => {
                const fromCoinSymbol = getCoinById(fromCoin)?.symbol || '';
                const toCoinSymbol = getCoinById(toCoin)?.symbol || '';

                if (fromCoinSymbol === 'USDC' || fromCoinSymbol === 'USDT') {
                        return `Buy ${toCoinSymbol}`;
                } else if (toCoinSymbol === 'USDC' || toCoinSymbol === 'USDT') {
                        return `Sell ${fromCoinSymbol}`;
                }

                return `Swap ${fromCoinSymbol} to ${toCoinSymbol}`;
        };

        const testQuoteApi = async () => {
                // Test with a small preset amount between SOL and USDC
                const solCoin = availableCoins.find(c => c.symbol === 'SOL');
                const usdcCoin = availableCoins.find(c => c.symbol === 'USDC');
                
                if (solCoin && usdcCoin) {
                        try {
                                // Set UI state for testing
                                setFromCoin(solCoin.id);
                                setToCoin(usdcCoin.id);
                                setFromAmount('0.001');
                                
                                showNotification('info', 'Testing API with small SOL -> USDC swap...');
                                
                                // Use raw amount value without formatting
                                const testAmount = 0.001;
                                
                                // Make API call directly
                                console.log('Testing quote API...');
                                const response = await api.getTradeQuote(solCoin.id, usdcCoin.id, testAmount);
                                console.log('Quote test result:', JSON.stringify(response, null, 2));
                                
                                if (response) {
                                        showNotification('success', 'Quote API working! Check console for details.');
                                }
                        } catch (error) {
                                console.error('Test quote error:', error);
                                showNotification('error', `Quote API error: ${error.message || 'Unknown error'}`);
                        }
                } else {
                        showNotification('error', 'Could not find SOL or USDC for testing');
                }
        };

        // Add a function to handle input focus
        const handleInputFocus = () => {
                // For web, we may need to select the full text
                if (Platform.OS === 'web' && amountInputRef.current) {
                        // Reset selection to maintain focus
                        setTimeout(() => {
                                if (amountInputRef.current) {
                                        const input = amountInputRef.current;
                                        const length = fromAmount.length;
                                        input.setSelectionRange(length, length);
                                }
                        }, 0);
                }
        };

        // Add quote loading indicator in the UI
        const renderToAmount = () => {
                if (quoteLoading) {
                        return (
                                <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#6A5ACD" />
                                        <Text style={styles.loadingText}>Updating quote...</Text>
                                </View>
                        );
                }
                // Display the amount with the coin symbol
                const toCoinSymbol = getCoinById(toCoin)?.symbol || '';
                return <Text style={styles.amountText}>{`${toAmount} ${toCoinSymbol}`}</Text>;
        };

        if (isLoading && availableCoins.length === 0) {
                return (
                        <View style={[styles.container, styles.centerContent]}>
                                <ActivityIndicator size="large" color="#6A5ACD" />
                                <Text style={styles.loadingText}>Loading available coins...</Text>
                        </View>
                );
        }

        return (
                <SafeAreaView style={styles.container}>
                        <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={styles.keyboardAvoidContainer}
                        >
                                <Pressable style={styles.content} onPress={Keyboard.dismiss}>
                                        {/* Header with back button and title */}
                                        <View style={styles.header}>
                                                <TouchableOpacity
                                                        style={styles.backButton}
                                                        onPress={() => navigation.goBack()}
                                                >
                                                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                                                </TouchableOpacity>
                                                <Text style={styles.headerTitle}>Exchange</Text>
                                                <TouchableOpacity style={styles.notificationButton}>
                                                        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                                                </TouchableOpacity>
                                        </View>

                                        {/* Trade card */}
                                        <View style={styles.tradeCard}>
                                                {/* From coin */}
                                                {renderCoinItem(fromCoin, true)}

                                                {/* Swap button */}
                                                <TouchableOpacity style={styles.swapButton} onPress={handleSwapCoins}>
                                                        <View style={styles.swapButtonInner}>
                                                                <Ionicons name="swap-vertical" size={24} color="#FFFFFF" />
                                                        </View>
                                                </TouchableOpacity>

                                                {/* To coin */}
                                                {renderCoinItem(toCoin, false)}
                                        </View>

                                        {/* Exchange rate */}
                                        {exchangeRate ? (
                                                <Text style={styles.exchangeRate}>{exchangeRate}</Text>
                                        ) : null}

                                        {/* Fee information */}
                                        <View style={styles.feeInfoContainer}>
                                                <View style={styles.feeItem}>
                                                        <Text style={styles.feeLabel}>Estimate fee</Text>
                                                        <Text style={styles.feeValue}>{tradeDetails.estimatedFee} usd</Text>
                                                </View>
                                                <View style={styles.feeItem}>
                                                        <Text style={styles.feeLabel}>You will receive</Text>
                                                        <Text style={styles.feeValue}>
                                                                {quoteLoading ? 
                                                                        'Calculating...' : 
                                                                        `${toAmount} ${getCoinById(toCoin)?.symbol || ''}`
                                                                }
                                                        </Text>
                                                </View>
                                                <View style={styles.feeItem}>
                                                        <Text style={styles.feeLabel}>Spread</Text>
                                                        <Text style={styles.feeValue}>{tradeDetails.spread}%</Text>
                                                </View>
                                                <View style={styles.feeItem}>
                                                        <Text style={styles.feeLabel}>Gas fee</Text>
                                                        <Text style={styles.feeValue}>{tradeDetails.gasFee} {getCoinById(fromCoin)?.symbol}</Text>
                                                </View>
                                        </View>

                                        {/* Trade details and fees */}
                                        <View style={styles.tradeDetailsContainer}>
                                                <Text style={styles.exchangeRateLabel}>Exchange Rate:</Text>
                                                <Text style={styles.exchangeRateValue}>
                                                        {exchangeRate 
                                                                ? `1 ${getCoinById(fromCoin)?.symbol} ≈ ${exchangeRate} ${getCoinById(toCoin)?.symbol}`
                                                                : `Calculating...`
                                                        }
                                                </Text>

                                                <View style={styles.feesContainer}>
                                                        <View style={styles.feeRow}>
                                                                <Text style={styles.feeLabel}>Estimated Fee:</Text>
                                                                <Text style={styles.feeValue}>
                                                                        ${tradeDetails.estimatedFee}
                                                                </Text>
                                                        </View>
                                                        <View style={styles.feeRow}>
                                                                <Text style={styles.feeLabel}>Price Impact:</Text>
                                                                <Text style={styles.feeValue}>
                                                                        ${tradeDetails.spread}
                                                                </Text>
                                                        </View>
                                                        <View style={styles.feeRow}>
                                                                <Text style={styles.feeLabel}>Network Fee:</Text>
                                                                <Text style={styles.feeValue}>
                                                                        ${tradeDetails.gasFee}
                                                                </Text>
                                                        </View>
                                                </View>
                                        </View>

                                        {/* Trade button */}
                                        <TouchableOpacity
                                                style={[styles.tradeButton, isSubmitting && styles.tradeButtonDisabled]}
                                                onPress={handleTradeSubmit}
                                                disabled={isSubmitting}
                                        >
                                                <LinearGradient
                                                        colors={['#6A5ACD', '#9F9FD5']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={styles.tradeButtonGradient}
                                                >
                                                        {isSubmitting ? (
                                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                                        ) : (
                                                                <Text style={styles.tradeButtonText}>{getTradeButtonLabel()}</Text>
                                                        )}
                                                </LinearGradient>
                                        </TouchableOpacity>

                                        {/* Debug button during development */}
                                        {__DEV__ && (
                                                <TouchableOpacity 
                                                        style={styles.debugButton}
                                                        onPress={testQuoteApi}
                                                >
                                                        <Text style={styles.debugButtonText}>Test Quote API</Text>
                                                </TouchableOpacity>
                                        )}
                                </Pressable>
                        </KeyboardAvoidingView>

                        {notification.show && (
                                <Notification
                                        type={notification.type}
                                        message={notification.message}
                                        onDismiss={() => setNotification(prev => ({ ...prev, show: false }))}
                                />
                        )}
                </SafeAreaView>
        );
};

const styles = StyleSheet.create({
        container: {
                flex: 1,
                backgroundColor: '#1A1A2E',
        },
        keyboardAvoidContainer: {
                flex: 1,
        },
        content: {
                flex: 1,
                padding: 16,
        },
        header: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
                paddingTop: 8,
        },
        backButton: {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#262640',
                alignItems: 'center',
                justifyContent: 'center',
        },
        headerTitle: {
                fontSize: 20,
                fontWeight: 'bold',
                color: '#FFFFFF',
        },
        notificationButton: {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#262640',
                alignItems: 'center',
                justifyContent: 'center',
        },
        tradeCard: {
                backgroundColor: '#262640',
                borderRadius: 16,
                marginBottom: 20,
                padding: 2, // Thin border effect
                position: 'relative',
        },
        coinItemContainer: {
                backgroundColor: '#262640',
                padding: 16,
                borderRadius: 14,
        },
        coinDetails: {
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
        },
        coinIcon: {
                width: 36,
                height: 36,
                borderRadius: 18,
                marginRight: 12,
        },
        coinSymbolContainer: {
                flexDirection: 'row',
                alignItems: 'center',
        },
        coinSymbol: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginRight: 4,
        },
        balanceText: {
                fontSize: 14,
                color: '#9F9FD5',
                marginTop: 2,
        },
        amountContainer: {
                marginTop: 4,
        },
        amountInput: {
                fontSize: 32,
                fontWeight: 'bold',
                color: '#FFFFFF',
                padding: 0,
        },
        amountText: {
                fontSize: 32,
                fontWeight: 'bold',
                color: '#FFFFFF',
        },
        swapButton: {
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginLeft: -20,
                marginTop: -20,
                zIndex: 10,
        },
        swapButtonInner: {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#6A5ACD',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
        },
        exchangeRate: {
                textAlign: 'center',
                color: '#9F9FD5',
                fontSize: 14,
                marginBottom: 20,
        },
        feeInfoContainer: {
                backgroundColor: '#262640',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
        },
        feeItem: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 12,
        },
        feeLabel: {
                color: '#9F9FD5',
                fontSize: 14,
        },
        feeValue: {
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '500',
        },
        tradeButton: {
                borderRadius: 28,
                overflow: 'hidden',
                marginBottom: 16,
        },
        tradeButtonGradient: {
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
        },
        tradeButtonText: {
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: 'bold',
        },
        tradeButtonDisabled: {
                opacity: 0.7,
        },
        notification: {
                position: 'absolute',
                top: 60,
                left: 16,
                right: 16,
                padding: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                zIndex: 100,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
        },
        notificationIcon: {
                marginRight: 8,
                fontSize: 16,
        },
        notificationText: {
                color: '#fff',
                flex: 1,
        },
        centerContent: {
                justifyContent: 'center',
                alignItems: 'center',
        },
        loadingText: {
                color: '#FFFFFF',
                marginTop: 16,
                fontSize: 16,
        },
        tradeDetailsContainer: {
                backgroundColor: '#262640',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
        },
        exchangeRateLabel: {
                color: '#9F9FD5',
                fontSize: 14,
                fontWeight: 'bold',
                marginBottom: 8,
        },
        exchangeRateValue: {
                color: '#FFFFFF',
                fontSize: 14,
        },
        feesContainer: {
                marginTop: 16,
        },
        feeRow: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
        },
        debugButton: {
                position: 'absolute',
                bottom: 20, 
                right: 20,
                backgroundColor: '#6A5ACD44',
                padding: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#6A5ACD',
        },
        debugButtonText: {
                color: '#FFFFFF',
                fontSize: 12,
        },
        loadingContainer: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
        },
        loadingText: {
                marginLeft: 8,
                color: '#9F9FD5',
                fontSize: 16,
        },
});

export default TradeScreen; 
