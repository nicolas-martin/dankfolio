import React from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, ActivityIndicator, Icon } from 'react-native-paper';
import { TradeConfirmationProps } from './types';
import { createStyles } from './styles';
import { Coin } from '@/types';
import { CachedImage } from '@/components/Common/CachedImage';
import { formatNumber, formatPrice } from '@/utils/numberFormat';

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

	const CoinIcon: React.FC<{ coin: Coin }> = ({ coin }) => {
		return (
			<CachedImage
				uri={coin.iconUrl}
				size={24}
				style={styles.tokenIcon}
				showLoadingIndicator={true}
				borderRadius={12}
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
						{coin && coin.price != null && amount && !isNaN(parseFloat(amount))
							? formatNumber(parseFloat(amount) * coin.price, true, 4)
							: '$0.00'}
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
		return (
			<View style={styles.feeSection} testID="fee-section">
				<View style={styles.feeRow}>
					<Text style={styles.feeLabel}>Network Fee</Text>
					<Text style={styles.feeValue}>{formatPrice(Number(fees.totalFee))}</Text>
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

