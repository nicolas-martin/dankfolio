import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, Text, TextInput } from 'react-native';
import { Coin } from '../../types/index';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import TopBar from '../../components/Common/TopBar';
import CoinSelector from '../../components/Trade/CoinSelector';
import SwapButton from '../../components/Trade/SwapButton';
import TradeDetails from '../../components/Trade/TradeDetails';
import TradeButton from '../../components/Trade/TradeButton';
import { useToast } from '../../components/Common/Toast';
import { styles } from './styles';
import { TradeScreenParams } from './types';
import {
	DEFAULT_AMOUNT,
	QUOTE_DEBOUNCE_MS,
	fetchTradeQuote,
	handleSwapCoins,
	handleTrade
} from './scripts';

const Trade: React.FC = () => {
	const navigation = useNavigation();
	const route = useRoute<RouteProp<Record<string, TradeScreenParams>, string>>();
	const { initialFromCoin, initialToCoin } = route.params || {};

	const amountInputRef = useRef<TextInput>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
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

	const getQuote = useCallback((amount: string) => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			fetchTradeQuote(
				amount,
				fromCoin,
				toCoin,
				setQuoteLoading,
				setToAmount,
				setExchangeRate,
				setTradeDetails,
				errorLogged
			);
		}, QUOTE_DEBOUNCE_MS);
	}, [fromCoin, toCoin]);

	useEffect(() => {
		getQuote(fromAmount);
	}, [fromAmount, fromCoin, toCoin, getQuote]);

	const onSwapPress = useCallback(() => {
		handleSwapCoins(
			fromCoin,
			toCoin,
			setFromCoin,
			setToCoin,
			fromAmount,
			setFromAmount,
			toAmount,
			setToAmount
		);
	}, [fromCoin, toCoin, fromAmount, toAmount]);

	const onTradePress = useCallback(() => {
		handleTrade(
			fromCoin,
			toCoin,
			fromAmount,
			toAmount,
			setIsSubmitting,
			showToast,
			navigation.navigate
		);
	}, [fromCoin, toCoin, fromAmount, toAmount, showToast, navigation]);

	const getTradeButtonLabel = (): string => {
		if (isSubmitting) return 'Processing...';
		if (!fromCoin || !toCoin) return 'Select coins';
		if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter amount';
		if (fromCoin.id === toCoin.id) return 'Cannot trade same coin';
		return 'Swap';
	};

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardAvoidingView}
			>
				<TopBar />
				<ScrollView style={styles.scrollView}>
					<View style={styles.tradeContainer}>
						{/* From Coin Selector */}
						<CoinSelector
							label="From"
							selectedCoin={fromCoin || undefined}
							amount={fromAmount}
							onAmountChange={setFromAmount}
							onCoinSelect={() => {
								const coin = fromCoin;
								if (coin) {
									setFromCoin(coin);
								}
							}}
							isInput
							inputRef={amountInputRef as React.RefObject<TextInput>}
						/>

						{/* Value Info */}
						{fromCoin && fromAmount && parseFloat(fromAmount) > 0 && (
							<View style={styles.valueInfo}>
								<Text style={styles.valueText}>
									≈ ${(parseFloat(fromAmount) * (fromCoin.price || 0)).toFixed(6)}

								</Text>
								<Text style={styles.priceText}>
									1 {fromCoin.symbol} = ${fromCoin.price ? fromCoin.price.toFixed(2) : '0.00'}
								</Text>
							</View>
						)}

						{/* Swap Button */}
						<SwapButton onPress={onSwapPress} />

						{/* To Coin Selector */}
						<CoinSelector
							label="To"
							selectedCoin={toCoin || undefined}
							amount={toAmount}
							isAmountLoading={quoteLoading}
							onCoinSelect={() => {
								const coin = toCoin;
								if (coin) {
									setToCoin(coin);
								}
							}}
						/>

						{/* Trade Details */}
						<TradeDetails
							exchangeRate={exchangeRate}
							gasFee={tradeDetails.gasFee}
							spread={tradeDetails.spread}
						/>

						{/* Trade Button */}
						<TradeButton
							onPress={onTradePress}
							isSubmitting={isSubmitting}
							disabled={!fromCoin || !toCoin || !fromAmount || !toAmount || isSubmitting}
							label={getTradeButtonLabel()}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

export default Trade;
