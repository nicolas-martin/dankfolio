import React from 'react';
import { View, Image } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, ActivityIndicator, Icon } from 'react-native-paper';
import { TradeConfirmationProps } from './types';
import { createStyles } from './styles';
// import { useToast } from '@components/Common/Toast'; // Kept in case of future use for other errors
import { Coin } from '@/types';
import { useProxiedImage } from '@/hooks/useProxiedImage';

const TradeConfirmation: React.FC<TradeConfirmationProps> = ({
	isVisible,
	onClose,
	onConfirm,
	fromAmount,
	toAmount,
	fromCoin,
	toCoin,
	fees,
	isLoading = false,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	// const { showToast } = useToast(); // Kept in case of future use

	const calculateValue = (amount: string, coin?: Coin): string => {
		if (!coin || !amount || isNaN(parseFloat(amount)) || coin.price == null) return '$0.00';
		return `$${(parseFloat(amount) * coin.price).toFixed(4)}`;
	};

	const formatExchangeRate = (): string => {
		if (!fromCoin || !toCoin || !fromAmount || !toAmount) return '0';
		const rate = parseFloat(toAmount) / parseFloat(fromAmount);
		return `1 ${fromCoin.symbol} = ${rate.toFixed(6)} ${toCoin.symbol}`;
	};

	const CoinIcon: React.FC<{ coin: Coin }> = ({ coin }) => {
		const { imageUri, isLoading: imageLoading } = useProxiedImage(coin.iconUrl);

		if (imageLoading || !imageUri) {
			return (
				<View style={styles.tokenIcon}>
					<ActivityIndicator size={12} color={theme.colors.onPrimary} />
				</View>
			);
		}

		return (
			<Image
				source={{ uri: imageUri }}
				style={[styles.tokenIcon, { backgroundColor: 'transparent' }]}
			/>
		);
	};

	const renderTradeCard = (
		coin: Coin,
		amount: string
	) => (
		<View style={styles.tradeCard}>
			<View style={styles.amountRow}>
				<View style={styles.tokenInfo}>
					<CoinIcon coin={coin} />
					<Text style={styles.tokenSymbol}>{coin.symbol}</Text>
				</View>
				<View style={styles.amountContainer}>
					<Text style={styles.amount}>{amount}</Text>
					<Text style={styles.amountValue}>
						{calculateValue(amount, coin)}
					</Text>
				</View>
			</View>
		</View>
	);

	const renderTradeCardsWithSwap = () => (
		<View style={styles.tradeCardsContainer}>
			{renderTradeCard(fromCoin!, fromAmount)}

			{/* Swap Icon */}
			<View style={styles.swapIconContainer}>
				<Icon
					source="swap-vertical"
					size={20}
					color={theme.colors.onSurface}
				/>
			</View>

			{renderTradeCard(toCoin!, toAmount)}
		</View>
	);

	const renderExchangeSection = () => (
		<View style={styles.exchangeSection}>
			<View style={styles.exchangeHeader}>
				<View style={styles.exchangeIcon}>
					<Icon
						source="swap-horizontal"
						size={14}
						color={theme.colors.onSurface}
					/>
				</View>
				<Text style={styles.exchangeTitle}>Exchange Rate</Text>
			</View>
			<Text style={styles.exchangeRate}>{formatExchangeRate()}</Text>
		</View>
	);

	const renderFeeSection = () => {
		const roundedPriceImpact = parseFloat(fees.priceImpactPct).toFixed(4);

		return (
			<View style={styles.feeSection}>
				<Text style={styles.feeHeader}>Transaction Details</Text>

				<View style={styles.feeRow}>
					<Text style={styles.feeLabel}>Price Impact</Text>
					<Text style={styles.feeValue}>{roundedPriceImpact}%</Text>
				</View>

				<View style={styles.feeRow}>
					<Text style={styles.feeLabel}>Network Fee</Text>
					<Text style={styles.feeValue}>{fees.gasFee} SOL</Text>
				</View>

				<View style={styles.totalFeeRow}>
					<Text style={styles.totalFeeLabel}>Total Fee</Text>
					<Text style={styles.totalFeeValue}>${fees.totalFee}</Text>
				</View>
			</View>
		);
	};

	const renderWarningSection = () => {
		if (parseFloat(fees.priceImpactPct) <= 2) return null;

		return (
			<View style={styles.warningContainer}>
				<View style={styles.warningIcon}>
					<Icon
						source="alert"
						size={18}
						color={theme.colors.onErrorContainer}
					/>
				</View>
				<Text style={styles.warningText}>
					High price impact detected. This trade may result in unfavorable rates due to low liquidity.
				</Text>
			</View>
		);
	};

	if (!fromCoin || !toCoin) {
		return (
			<Portal>
				<Modal
					visible={isVisible}
					onDismiss={onClose}
					contentContainerStyle={styles.container}
				>
					<View style={styles.header}>
						<Text style={styles.title}>Confirm Trade</Text>
						<Text style={styles.subtitle}>Loading trade details...</Text>
					</View>
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={theme.colors.primary} />
						<Text style={styles.loadingText}>Preparing your trade</Text>
					</View>
				</Modal>
			</Portal>
		);
	}

	return (
		<Portal>
			<Modal
				visible={isVisible}
				onDismiss={onClose}
				contentContainerStyle={styles.container}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Confirm Trade</Text>
					<Text style={styles.subtitle}>Review your transaction details</Text>
				</View>

				{/* Trade Summary Cards with Swap Icon */}
				{renderTradeCardsWithSwap()}

				{/* Exchange Rate */}
				{renderExchangeSection()}

				{/* Fee Details */}
				{renderFeeSection()}

				{/* Warning Section */}
				{renderWarningSection()}

				{/* Action Buttons */}
				<View style={styles.buttonContainer}>
					<Button
						mode="outlined"
						onPress={onClose}
						style={styles.cancelButton}
						disabled={isLoading}
						testID="cancel-trade-button"
					>
						Cancel
					</Button>
					<Button
						mode="contained"
						onPress={onConfirm}
						style={styles.confirmButton}
						loading={isLoading}
						disabled={isLoading}
						testID="confirm-trade-button"
					>
						{isLoading ? 'Processing...' : 'Confirm'}
					</Button>
				</View>
			</Modal>
		</Portal>
	);
};

export default TradeConfirmation;
