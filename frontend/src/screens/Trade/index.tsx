import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { TradeScreenParams } from './trade_types';
import { createStyles } from './trade_styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import CoinSelector from '@components/Trade/CoinSelector';
import TradeDetails from '@components/Trade/TradeDetails';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import { fetchTradeQuote, handleTrade } from './trade_scripts';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';

type TradeScreenNavigationProp = NavigationProp<Record<string, TradeScreenParams>>;
type TradeScreenRouteProp = RouteProp<Record<string, TradeScreenParams>, string>;

const Trade: React.FC = () => {
	const navigation = useNavigation<TradeScreenNavigationProp>();
	const route = useRoute<TradeScreenRouteProp>();
	const { initialFromCoin, initialToCoin } = route.params;
	const { tokens, wallet } = usePortfolioStore();
	const { getCoinByID } = useCoinStore();
	const [fromCoin, setFromCoin] = useState<Coin>(initialFromCoin);
	const [toCoin, setToCoin] = useState<Coin>(initialToCoin);
	const [fromAmount, setFromAmount] = useState<string>('');
	const [toAmount, setToAmount] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);
	const [tradeDetails, setTradeDetails] = useState<TradeDetailsProps>({
		exchangeRate: '0',
		gasFee: '0',
		priceImpactPct: '0',
		totalFee: '0'
	});
	const { showToast } = useToast();
	const theme = useTheme();
	const styles = createStyles(theme);
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

	// Refresh coin prices on screen load
	useEffect(() => {
		let isMounted = true;
		const refreshCoinPrices = async () => {
			try {
				const [updatedFromCoin, updatedToCoin] = await Promise.all([
					getCoinByID(fromCoin.id, true),  // Force refresh
					getCoinByID(toCoin.id, true)     // Force refresh
				]);
				if (!isMounted) return;
				if (updatedFromCoin) setFromCoin(updatedFromCoin);
				if (updatedToCoin) setToCoin(updatedToCoin);
			} catch (error) {
				console.error('Failed to refresh coin prices:', error);
				if (isMounted) {
					showToast({
						type: 'error',
						message: 'Failed to refresh prices. Please try again later.'
					});
				}
			}
		};
		refreshCoinPrices();
		return () => {
			isMounted = false;
		};
	}, []); // Only run on mount

	// Get portfolio token data if available
	const fromPortfolioToken = useMemo(() => {
		return tokens.find(token => token.id === fromCoin.id);
	}, [tokens, fromCoin.id]);

	const toPortfolioToken = useMemo(() => {
		return tokens.find(token => token.id === toCoin.id);
	}, [tokens, toCoin.id]);

	const handleFromAmountChange = async (amount: string) => {
		console.log('🔄 From Amount Change:', {
			amount,
			fromCoin: fromCoin.symbol,
			toCoin: toCoin.symbol
		});

		setFromAmount(amount);
		if (!amount || isNaN(parseFloat(amount))) {
			console.log('❌ Invalid amount, clearing toAmount');
			setToAmount('');
			return;
		}

		await fetchTradeQuote(
			amount,
			fromCoin,
			toCoin,
			setIsQuoteLoading,
			setToAmount,
			setTradeDetails
		);
	};

	const handleToAmountChange = async (amount: string) => {
		console.log('🔄 To Amount Change:', {
			amount,
			fromCoin: fromCoin.symbol,
			toCoin: toCoin.symbol
		});

		setToAmount(amount);
		if (!amount || isNaN(parseFloat(amount))) {
			console.log('❌ Invalid amount, clearing fromAmount');
			setFromAmount('');
			return;
		}

		await fetchTradeQuote(
			amount,
			toCoin,
			fromCoin,
			setIsQuoteLoading,
			setFromAmount,
			setTradeDetails
		);
	};

	useEffect(() => {
		console.log('💱 Trade Details Updated:', {
			exchangeRate: tradeDetails.exchangeRate,
			fromAmount,
			toAmount,
			fromCoin: fromCoin.symbol,
			toCoin: toCoin.symbol
		});
	}, [tradeDetails, fromAmount, toAmount]);

	useEffect(() => {
		// Log price information whenever coins or amounts change
		console.log('💰 Price Debug:', {
			fromCoin: {
				symbol: fromCoin.symbol,
				price: fromCoin.price,
				amount: fromAmount,
				valueUSD: fromAmount ? parseFloat(fromAmount) * fromCoin.price : 0
			},
			toCoin: {
				symbol: toCoin.symbol,
				price: toCoin.price,
				amount: toAmount,
				valueUSD: toAmount ? parseFloat(toAmount) * toCoin.price : 0
			}
		});
	}, [fromCoin, toCoin, fromAmount, toAmount]);

	const handleTradeSubmit = async () => {
		if (!fromAmount || !toAmount || !wallet) {
			showToast({ type: 'error', message: !wallet ? 'Please connect your wallet' : 'Please enter valid amounts' });
			return;
		}
		setIsConfirmationVisible(true);
	};

	const handleTradeConfirm = async () => {
		if (!wallet) {
			showToast({ type: 'error', message: 'Please connect your wallet' });
			return;
		}

		setIsLoading(true);
		try {
			await handleTrade(
				fromCoin,
				toCoin,
				fromAmount,
				0.5, // 0.5% slippage
				wallet,
				navigation,
				setIsLoading,
				showToast
			);
			setIsConfirmationVisible(false);
		} catch (error) {
			console.error('Error executing trade:', error);
			showToast({ type: 'error', message: 'Failed to execute trade' });
		} finally {
			setIsLoading(false);
		}
	};

	const handleSwapCoins = () => {
		const tempCoin = fromCoin;
		const tempAmount = fromAmount;
		setFromCoin(toCoin);
		setToCoin(tempCoin);
		setFromAmount(toAmount);
		setToAmount(tempAmount);
	};

	if (!wallet) {
		return (
			<View style={styles.noWalletContainer}>
				<Text style={{ color: theme.colors.onSurface }}>Please connect your wallet to trade</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.padding}>
					<View style={styles.valueInfoContainer}>
						<CoinSelector
							label="From"
							coinData={{
								coin: fromCoin,
								balance: fromPortfolioToken ? {
									amount: fromPortfolioToken.amount,
									value: fromPortfolioToken.value
								} : undefined
							}}
							amount={{
								value: fromAmount,
								onChange: handleFromAmountChange,
							}}
							isInput
						/>
					</View>

					<Button
						mode="text"
						onPress={handleSwapCoins}
						style={styles.valueInfoContainer}
					>
						Swap
					</Button>

					<View style={styles.valueInfoContainer}>
						<CoinSelector
							label="To"
							coinData={{
								coin: toCoin,
								balance: toPortfolioToken ? {
									amount: toPortfolioToken.amount,
									value: toPortfolioToken.value
								} : undefined
							}}
							amount={{
								value: toAmount,
								onChange: handleToAmountChange,
								isLoading: isQuoteLoading
							}}
							isInput
						/>
					</View>

					{fromAmount && toAmount && (
						<TradeDetails
							exchangeRate={tradeDetails.exchangeRate}
							gasFee={tradeDetails.gasFee}
							priceImpactPct={tradeDetails.priceImpactPct}
							totalFee={tradeDetails.totalFee}
							route={tradeDetails.route}
						/>
					)}
				</View>
			</ScrollView>

			<View style={styles.padding}>
				<Button
					mode="contained"
					onPress={handleTradeSubmit}
					disabled={!fromAmount || !toAmount}
					style={{ width: '100%' }}
				>
					Trade
				</Button>
			</View>

			<TradeConfirmation
				isVisible={isConfirmationVisible}
				onClose={() => setIsConfirmationVisible(false)}
				onConfirm={handleTradeConfirm}
				fromCoin={{
					id: fromCoin.id,
					symbol: fromCoin.symbol,
					amount: fromAmount,
				}}
				toCoin={{
					id: toCoin.id,
					symbol: toCoin.symbol,
					amount: toAmount,
				}}
				fees={tradeDetails}
				isLoading={isLoading}
			/>
		</View>
	);
};

export default Trade;
