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
		amount: string,
		cardTestID: string
	) => (
		<View style={styles.tradeCard} testID={cardTestID}>
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
			{renderTradeCard(fromCoin!, fromAmount, "from-coin-details")}

			{/* Swap Icon */}
			<View style={styles.swapIconContainer}>
				<Icon
					source="swap-vertical"
					size={20}
					color={theme.colors.onSurface}
				/>
			</View>

			{renderTradeCard(toCoin!, toAmount, "to-coin-details")}
		</View>
	);

	const renderFeeSection = () => {
		const priceImpact = parseFloat(fees.priceImpactPct);
		const showWarning = priceImpact > 2;

		return (
			<View style={styles.feeSection} testID="fee-section">
				{showWarning && (
					<View style={styles.warningRow}>
						<Icon source="alert" size={16} color={theme.colors.error} />
						<Text style={styles.warningRowText}>High Price Impact</Text>
						<Text style={styles.warningValue}>{priceImpact.toFixed(2)}%</Text>
					</View>
				)}
				
				<View style={styles.feeRow}>
					<Text style={styles.feeLabel}>Network Fee</Text>
					<Text style={styles.feeValue}>${fees.totalFee}</Text>
				</View>
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
					</View>
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={theme.colors.primary} testID="loading-spinner" />
						<Text style={styles.loadingText}>Preparing trade...</Text>
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
				</View>

				{/* Trade Summary */}
				{renderTradeCardsWithSwap()}

				{/* Fee Details */}
				{renderFeeSection()}

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
