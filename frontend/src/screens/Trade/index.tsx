import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { useToast } from '../../components/Common/Toast';
import { TradeScreenParams } from './trade_types';
import { createStyles } from './trade_styles';
import { usePortfolioStore } from '../../store/portfolio';
import { useCoinStore } from '../../store/coins';
import { Coin } from '../../types';
import CoinSelector from '../../components/Trade/CoinSelector';
import TradeDetails from '../../components/Trade/TradeDetails';
import { fetchTradeQuote, handleTrade } from './trade_scripts';
import { TradeDetailsProps } from '../../components/Trade/TradeDetails/tradedetails_types';

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

	// Get portfolio token data if available
	const fromPortfolioToken = useMemo(() => {
		return tokens.find(token => token.id === fromCoin.id);
	}, [tokens, fromCoin.id]);

	const toPortfolioToken = useMemo(() => {
		return tokens.find(token => token.id === toCoin.id);
	}, [tokens, toCoin.id]);

	const handleFromAmountChange = async (amount: string) => {
		setFromAmount(amount);
		if (!amount || isNaN(parseFloat(amount))) {
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
		setToAmount(amount);
		if (!amount || isNaN(parseFloat(amount))) {
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

	const handleTradeSubmit = async () => {
		if (!fromAmount || !toAmount || !wallet) {
			showToast({ type: 'error', message: !wallet ? 'Please connect your wallet' : 'Please enter valid amounts' });
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
			<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
							selectedCoin={fromCoin}
							amount={fromAmount}
							onAmountChange={handleFromAmountChange}
							isInput
							approxValue={fromPortfolioToken?.value?.toFixed(2)}
							rateText={fromPortfolioToken ? `Balance: ${fromPortfolioToken.amount.toFixed(4)} ${fromCoin.symbol}` : undefined}
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
							selectedCoin={toCoin}
							amount={toAmount}
							onAmountChange={handleToAmountChange}
							isInput
							approxValue={toPortfolioToken?.value?.toFixed(2)}
							rateText={toPortfolioToken ? `Balance: ${toPortfolioToken.amount.toFixed(4)} ${toCoin.symbol}` : undefined}
							isAmountLoading={isQuoteLoading}
						/>
					</View>

					{fromAmount && toAmount && (
						<TradeDetails
							exchangeRate={tradeDetails.exchangeRate}
							gasFee={tradeDetails.gasFee}
							priceImpactPct={tradeDetails.priceImpactPct}
							totalFee={tradeDetails.totalFee}
						/>
					)}
				</View>
			</ScrollView>

			<View style={styles.padding}>
				<Button
					mode="contained"
					onPress={handleTradeSubmit}
					loading={isLoading}
					disabled={isLoading || !fromAmount || !toAmount}
					style={{ width: '100%' }}
				>
					Trade
				</Button>
			</View>
		</View>
	);
};

export default Trade;
