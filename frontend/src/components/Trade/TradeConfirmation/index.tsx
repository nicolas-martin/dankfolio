import React from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingAnimation } from '@/components/Common/Animations';
import { TradeConfirmationProps } from './types';
import ManagedBottomSheetModal from '@/components/Common/BottomSheet';
import { useStyles } from './styles';
import { Coin } from '@/types';
import CachedImage from '@/components/Common/CachedImage';
import { formatPrice, formatAddress as utilFormatAddress } from '@/utils/numberFormat';
import ModalActionButtons from 'components/Common/ModalActionButton';

const TradeConfirmation: React.FC<TradeConfirmationProps> = ({
	isVisible,
	onClose,
	onConfirm,
	fromAmount,
	toAmount,
	fromToken,
	toToken,
	isLoading = false,
	operationType = 'swap',
	recipientAddress,
}) => {
	const styles = useStyles();

	const TokenIcon: React.FC<{ token: Coin }> = ({ token }) => {

		if (token.logoURI) {
			return (
				<CachedImage
					uri={token.logoURI}
					size={32}
					style={styles.tokenIcon}
					showLoadingIndicator={true}
					borderRadius={16}
				/>
			);
		}
		return <View style={styles.placeholderIconStyle} />;
	};

	const handleSolscanPress = () => {
		if (recipientAddress) {
			const solscanUrl = `https://solscan.io/account/${recipientAddress}`;
			Linking.openURL(solscanUrl);
		}
	};

	const renderTokenRow = (
		token: Coin,
		amount: string,
		testIdPrefix: string,
		isRecipient = false
	) => {
		return (
			<View style={styles.tradeRow} testID={`${testIdPrefix}-token-details`}>
				<View style={styles.tokenInfo}>
					{isRecipient ? (
						<Icon source="account" size={32} color={styles.colors.onSurfaceVariant} />
					) : (
						<TokenIcon token={token} />
					)}
					<View style={styles.tokenDetails}>
						{isRecipient ? (
							<>
								<Text style={styles.tokenSymbol}>To</Text>
								<TouchableOpacity onPress={handleSolscanPress} testID="solscan-link">
									<Text style={styles.recipientAddressTextStyle}>
										{utilFormatAddress(amount, 6, 6)}
									</Text>
								</TouchableOpacity>
							</>
						) : (
							<>
								<Text style={styles.tokenSymbol} testID={`${testIdPrefix}-token-symbol-${token?.symbol?.toLowerCase() || 'unknown'}`}>
									{token.symbol}
								</Text>
								<Text style={styles.tokenName} testID={`${testIdPrefix}-token-name-${token?.symbol?.toLowerCase() || 'unknown'}`}>
									{token.name}
								</Text>
							</>
						)}
					</View>
				</View>
				<View style={styles.amountInfo}>
					{isRecipient ? (
						<TouchableOpacity onPress={handleSolscanPress} style={styles.solscanButton} testID="solscan-button">
							<Icon source="open-in-new" size={16} color={styles.colors.primary} />
							<Text style={styles.solscanText}>Solscan</Text>
						</TouchableOpacity>
					) : (
						<>
							<Text style={styles.amount} testID={`${testIdPrefix}-token-amount`}>
								{isNaN(Number(amount)) ? '0' : amount}
							</Text>
							<Text style={styles.amountUsd} testID={`${testIdPrefix}-token-amount-usd`}>
								{formatPrice(isNaN(Number(amount)) ? 0 : Number(amount) * (token.price || 0))}
							</Text>
						</>
					)}
				</View>
			</View>
		);
	};

	// const renderActionButtons = () => { // Replaced by ModalActionButtons
	// 	const cancelTestId = `cancel-${operationType}-button`;
	// 	const confirmTestId = `confirm-${operationType}-button`;
	// 	const actionLabel = operationType;

	// 	return (
	// 		<View style={styles.buttonContainer}>
	// 			<Button
	// 				mode="outlined"
	// 				onPress={onClose}
	// 				style={styles.cancelButton}
	// 				labelStyle={styles.cancelButtonLabel}
	// 				disabled={isLoading}
	// 				testID={cancelTestId}
	// 				accessible={true}
	// 				accessibilityRole="button"
	// 				accessibilityLabel={`Cancel ${actionLabel}`}
	// 			>
	// 				Cancel
	// 			</Button>
	// 			<Button
	// 				mode="contained"
	// 				onPress={onConfirm}
	// 				style={styles.confirmButton}
	// 				labelStyle={styles.confirmButtonLabel}
	// 				loading={isLoading}
	// 				disabled={isLoading}
	// 				testID={confirmTestId}
	// 				accessible={true}
	// 				accessibilityRole="button"
	// 				accessibilityLabel={isLoading ? `Processing ${actionLabel}` : `Confirm ${actionLabel}`}
	// 			>
	// 				{isLoading ? 'Processing...' : 'Confirm'}
	// 			</Button>
	// 		</View>
	// 	);
	// };

	const renderLoadingState = () => {
		const title = operationType === 'send' ? 'Confirm Send' : 'Confirm Trade';
		const loadingText = operationType === 'send' ? 'Preparing send...' : 'Preparing trade...';

		return (
			<>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.loadingContainer}>
					<LoadingAnimation size={100} />
					<Text style={styles.loadingText}>{loadingText}</Text>
				</View>
			</>
		);
	};

	const renderContent = () => {
		const isSend = operationType === 'send';
		const title = isSend ? 'Confirm Send' : 'Confirm Trade';

		// Check if we have required data
		if (isSend && (!fromToken || !recipientAddress)) {
			return renderLoadingState();
		}
		if (!isSend && (!fromToken || !toToken)) {
			return renderLoadingState();
		}

		return (
			<>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
				</View>

				{/* Trade/Send Display */}
				<View style={styles.tradeContainer}>
					{/* From Token */}
					{renderTokenRow(fromToken!, fromAmount, operationType)}

					{/* Divider */}
					<View style={styles.divider} />

					{/* To Token or Recipient */}
					{isSend ? (
						renderTokenRow(fromToken!, recipientAddress!, 'recipient', true)
					) : (
						renderTokenRow(toToken!, toAmount, 'to')
					)}
				</View>

				{/* Action Buttons */}
				<View style={styles.actionSection}>
					<ModalActionButtons
						primaryButtonText={isLoading ? 'Processing...' : 'Confirm'}
						onPrimaryButtonPress={onConfirm}
						primaryButtonLoading={isLoading}
						primaryButtonDisabled={isLoading}
						primaryButtonTestID={`confirm-${operationType}-button`}
						secondaryButtonText="Cancel"
						onSecondaryButtonPress={onClose}
						secondaryButtonDisabled={isLoading}
						secondaryButtonTestID={`cancel-${operationType}-button`}
					/>
				</View>
			</>
		);
	};

	// Determine snap points, could be dynamic or fixed
	const snapPoints = React.useMemo(() => ['80%'], []); // Example fixed snap point

	return (
		<ManagedBottomSheetModal
			isVisible={isVisible}
			onClose={onClose}
			snapPoints={snapPoints}
		// title={operationType === 'send' ? 'Confirm Send' : 'Confirm Trade'} // Title can be passed to ManagedBottomSheetModal if it supports it
		>
			{renderContent()}
		</ManagedBottomSheetModal>
	);
};

export default TradeConfirmation;

