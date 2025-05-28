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
	fromToken,
	toToken,
	fees,
	isLoading = false,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const TokenIcon: React.FC<{ token: Coin }> = ({ token }) => {
		return (
			<CachedImage
				uri={token.iconUrl}
				size={32}
				style={styles.tokenIcon}
				showLoadingIndicator={true}
				borderRadius={16}
			/>
		);
	};

	if (!fromToken || !toToken) {
		return (
			<Portal>
				<Modal
					visible={isVisible}
					onDismiss={onClose}
					contentContainerStyle={styles.container}
				>
					<Text style={styles.title}>Confirm Trade</Text>
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
				{/* Trade Display */}
				<View style={styles.tradeContainer}>
					{/* From Amount */}
					<View style={styles.tradeRow}>
						<View style={styles.tokenInfo}>
							<TokenIcon token={fromToken} />
							<View style={styles.tokenDetails}>
								<Text style={styles.tokenSymbol}>{fromToken.symbol}</Text>
								<Text style={styles.tokenName}>{fromToken.name}</Text>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<Text style={styles.amount}>{formatNumber(Number(fromAmount), false, 6)}</Text>
							<Text style={styles.amountUsd}>
								{formatPrice(Number(fromAmount) * (fromToken.price || 0))}
							</Text>
						</View>
					</View>

					{/* Divider */}
					<View style={styles.divider} />

					{/* To Amount */}
					<View style={styles.tradeRow}>
						<View style={styles.tokenInfo}>
							<TokenIcon token={toToken} />
							<View style={styles.tokenDetails}>
								<Text style={styles.tokenSymbol}>{toToken.symbol}</Text>
								<Text style={styles.tokenName}>{toToken.name}</Text>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<Text style={styles.amount}>{formatNumber(Number(toAmount), false, 6)}</Text>
							<Text style={styles.amountUsd}>
								{formatPrice(Number(toAmount) * (toToken.price || 0))}
							</Text>
						</View>
					</View>
				</View>

				{/* Network Fee */}
				<View style={styles.feeContainer} testID="fee-section">
					<Text style={styles.feeLabel}>Network Fee</Text>
					<Text style={styles.feeValue}>{formatPrice(Number(fees.totalFee))}</Text>
				</View>

				{/* Action Buttons */}
				<View style={styles.buttonContainer}>
					<Button
						mode="outlined"
						onPress={onClose}
						style={styles.cancelButton}
						labelStyle={styles.cancelButtonLabel}
						disabled={isLoading}
						testID="cancel-trade-button"
					>
						Cancel
					</Button>
					<Button
						mode="contained"
						onPress={onConfirm}
						style={styles.confirmButton}
						labelStyle={styles.confirmButtonLabel}
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

