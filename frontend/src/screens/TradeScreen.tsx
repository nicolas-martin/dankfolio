import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin } from '../types/index';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TopBar from '../components/TopBar';
import CoinSelector from '../components/CoinSelector';
import SwapButton from '../components/SwapButton';
import TradeDetails from '../components/TradeDetails';
import TradeButton from '../components/TradeButton';
import PriceDisplay from '../components/PriceDisplay';
import api from '../services/api';
import { buildAndSignSwapTransaction, getKeypairFromPrivateKey, secureStorage } from '../services/solana';
import { useToast } from '../components/Toast';

const MIN_AMOUNT = "0.0001";
const DEFAULT_AMOUNT = "0.0001";
const QUOTE_DEBOUNCE_MS = 500;


type TradeScreenParams = {
	initialFromCoin: Coin | null;
	initialToCoin: Coin | null;
};

const TradeScreen: React.FC = () => {
	const navigation = useNavigation();
	const route = useRoute<RouteProp<Record<string, TradeScreenParams>, string>>();
	const { initialFromCoin, initialToCoin } = route.params || {};

	const amountInputRef = useRef(null);
	const debounceTimerRef = useRef(null);
	const errorLogged = useRef<string[]>([]);

	const [fromCoin, setFromCoin] = useState<Coin | null>(initialFromCoin);
	const [toCoin, setToCoin] = useState<Coin | null>(initialToCoin);
	const [fromAmount, setFromAmount] = useState(DEFAULT_AMOUNT);
	const [toAmount, setToAmount] = useState('0');
	const [exchangeRate, setExchangeRate] = useState('');
	const [tradeDetails, setTradeDetails] = useState({
		estimatedFee: '0.00',
		spread: '0.00',
		gasFee: '0.00',
	});
	const { showToast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [quoteLoading, setQuoteLoading] = useState(false);

	const fetchTradeQuote = useCallback(async (amount: string) => {
		if (!amount || !fromCoin || !toCoin) {
			return;
		}

		// Validate coin addresses
		const fromAddress = fromCoin?.address || fromCoin?.id;
		const toAddress = toCoin?.address;

		if (!fromAddress || !toAddress) {
			return;
		}

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		// Create a new debounce timer
		debounceTimerRef.current = setTimeout(async () => {
			try {
				setQuoteLoading(true);

				// Convert amount to raw units based on decimals to avoid scientific notation
				const multiplier = Math.pow(10, fromCoin.decimals);
				const rawAmount = (parseFloat(amount) * multiplier).toFixed(0);

				const response = await api.getTradeQuote(
					fromAddress.trim(),
					toAddress.trim(),
					rawAmount
				);

				if (!response) {
					throw new Error('No response from trade quote');
				}

				// Use the raw estimatedAmount string from the API
				setToAmount(String(response.estimatedAmount));
				setExchangeRate(`${response.exchangeRate} ${toCoin.symbol || ''}`);
				setTradeDetails({
					estimatedFee: String(response.fee?.total || '0.00'),
					spread: String(response.fee?.spread || '0.00'),
					gasFee: String(response.fee?.gas || '0.00'),
				});
			} catch (error) {
				// Only log the error once per session for the same error type
				const errorMessage = error.message || 'Unknown error';
				if (!errorLogged.current.includes(errorMessage)) {
					console.error('❌ Error fetching trade quote:', error);
					errorLogged.current.push(errorMessage);
				}

				setToAmount('0');
				setExchangeRate('');
				setTradeDetails({
					estimatedFee: '0.00',
					spread: '0.00',
					gasFee: '0.00',
				});
			} finally {
				setQuoteLoading(false);
			}
		}, QUOTE_DEBOUNCE_MS);
	}, [fromCoin, toCoin]);

	const handleAmountChange = useCallback((text: string) => {
		const sanitized = text.replace(/[^\d.]/g, '');
		const parts = sanitized.split('.');
		const formatted = parts[0] + (parts[1] ? '.' + parts[1].slice(0, 9) : '');

		// Set amount immediately
		setFromAmount(formatted);

		// Only trigger quote if amount is valid
		if (parseFloat(formatted) > 0) {
			setQuoteLoading(true);
			fetchTradeQuote(formatted);
		} else {
			setQuoteLoading(false);
			setToAmount('0');
			setExchangeRate('');
			setTradeDetails({
				estimatedFee: '0.00',
				spread: '0.00',
				gasFee: '0.00',
			});
		}
	}, [fetchTradeQuote]);

	const handleSwapCoins = () => {
		if (!fromCoin || !toCoin) return;

		const oldFromCoin = fromCoin;
		const oldToCoin = toCoin;
		const oldFromAmount = fromAmount;
		const oldToAmount = toAmount;

		setFromCoin(oldToCoin);
		setToCoin(oldFromCoin);
		setFromAmount(oldToAmount);
		setToAmount(oldFromAmount);

		const newAmount = parseFloat(oldToAmount) > 0 ? oldToAmount : oldFromAmount;
		fetchTradeQuote(newAmount);
	};

	const handleSubmitTrade = async () => {
		if (!fromCoin || !toCoin || !fromAmount) {
			console.error('❌ Missing required trade parameters');
			return;
		}

		try {
			setIsSubmitting(true);

			// Get the wallet from secure storage
			const savedWallet = await secureStorage.getWallet();
			if (!savedWallet) {
				throw new Error('No wallet found');
			}

			// Create a keypair from the private key
			const wallet = getKeypairFromPrivateKey(savedWallet.privateKey);

			// Convert amount to raw units based on input token decimals
			const multiplier = Math.pow(10, fromCoin.decimals);
			const rawAmount = Math.floor(parseFloat(fromAmount) * multiplier);

			console.log('💱 Swap details:', {
				fromCoin: fromCoin.symbol,
				toCoin: toCoin.symbol,
				amount: fromAmount,
				rawAmount,
				decimals: fromCoin.decimals
			});

			const signedTransaction = await buildAndSignSwapTransaction(
				fromCoin.address || fromCoin.id,
				toCoin.address || toCoin.id,
				rawAmount.toString(),
				1, // 1% slippage
				wallet
			);

			const response = await api.executeTrade({
				from_coin_id: fromCoin.id,
				to_coin_id: toCoin.id,
				amount: parseFloat(fromAmount),
				signed_transaction: signedTransaction
			});

			showToast({
				message: 'Trade executed successfully! 🎉',
				txHash: response.transaction_hash,
				type: 'success'
			});

			console.log('✅ Trade executed successfully!');
			console.log('🔗 Transaction Hash:', response.transaction_hash);

			// Remove form reset to keep trade details visible
		} catch (error) {
			showToast({
				message: error.message || 'Failed to execute trade',
				type: 'error'
			});
			console.error('❌ Error submitting trade:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const getTradeButtonLabel = (): string => {
		if (isSubmitting) return 'Processing...';
		if (!fromCoin || !toCoin) return 'Select coins';
		if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter amount';
		if (fromCoin.id === toCoin.id) return 'Select different coins';
		return 'Swap';
	};

	// Initialize coins from props
	useEffect(() => {
		console.log('🔄 Trade Screen initialized with coins:', {
			fromCoin: fromCoin ? {
				id: fromCoin.id,
				symbol: fromCoin.symbol,
				name: fromCoin.name,
				decimals: fromCoin.decimals,
				price: fromCoin.price,
				iconUrl: fromCoin.iconUrl,
				address: fromCoin.address || fromCoin.id
			} : null,
			toCoin: toCoin ? {
				id: toCoin.id,
				symbol: toCoin.symbol,
				name: toCoin.name,
				decimals: toCoin.decimals,
				price: toCoin.price,
				iconUrl: toCoin.iconUrl,
				address: toCoin.address
			} : null,
			routeParams: {
				initialFromCoin: initialFromCoin ? {
					id: initialFromCoin.id,
					symbol: initialFromCoin.symbol,
					price: initialFromCoin.price
				} : null,
				initialToCoin: initialToCoin ? {
					id: initialToCoin.id,
					symbol: initialToCoin.symbol,
					price: initialToCoin.price
				} : null
			}
		});
	}, [fromCoin, toCoin, initialFromCoin, initialToCoin]);

	// Update coins when props change
	useEffect(() => {
		if (initialFromCoin) {
			setFromCoin(initialFromCoin);
		}
		if (initialToCoin) {
			setToCoin(initialToCoin);
		}
	}, [initialFromCoin, initialToCoin]);

	// Fetch quote when screen loads and coins are available
	useEffect(() => {
		if (fromCoin && toCoin) {
			console.log('🔄 Fetching initial trade quote with amount:', DEFAULT_AMOUNT);
			fetchTradeQuote(DEFAULT_AMOUNT);
		}
	}, [fromCoin, toCoin, fetchTradeQuote]);

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardAvoidingView}
			>
				<ScrollView style={styles.scrollView}>
					<TopBar />
					<View style={styles.tradeContainer}>
						<CoinSelector
							label="From"
							selectedCoin={fromCoin}
							excludeCoinId={toCoin?.id}
							amount={fromAmount}
							onAmountChange={handleAmountChange}
							onCoinSelect={() => { }}
							isInput
						/>

						{fromCoin && fromAmount && parseFloat(fromAmount) > 0 && (
							<View style={styles.valueInfo}>
								<Text style={styles.valueText}>
									≈ ${(parseFloat(fromAmount) * (fromCoin.price || 0)).toFixed(6)}
								</Text>
								<Text style={styles.priceText}>
									1 {fromCoin.symbol} = ${fromCoin.price ? fromCoin.price.toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									}) : '0.00'}
								</Text>
							</View>
						)}

						<SwapButton
							onPress={handleSwapCoins}
							disabled={!fromCoin || !toCoin}
						/>

						<CoinSelector
							label="To"
							selectedCoin={toCoin}
							excludeCoinId={fromCoin.id}
							amount={toAmount}
							isAmountLoading={quoteLoading}
							onCoinSelect={() => { }}
						/>

						{fromCoin && toCoin && fromAmount && toAmount && (
							<TradeDetails
								exchangeRate={exchangeRate}
								gasFee={tradeDetails.gasFee}
								spread={tradeDetails.spread}
							/>
						)}

						<TradeButton
							onPress={handleSubmitTrade}
							isSubmitting={isSubmitting}
							disabled={
								isSubmitting ||
								!fromCoin ||
								!toCoin ||
								fromCoin.id === toCoin.id ||
								!fromAmount ||
								parseFloat(fromAmount) <= 0
							}
							label={getTradeButtonLabel()}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#191B1F',
	},
	keyboardAvoidingView: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	tradeContainer: {
		backgroundColor: '#2A2A3E',
		borderRadius: 20,
		padding: 20,
		margin: 20,
	},
	valueInfo: {
		marginTop: -8,
		marginBottom: 12,
		paddingHorizontal: 12,
	},
	valueText: {
		fontSize: 14,
		color: '#9F9FD5',
		textAlign: 'right',
	},
	priceText: {
		fontSize: 12,
		color: '#9F9FD5',
		textAlign: 'right',
		marginTop: 2,
	},
});

export default TradeScreen;
