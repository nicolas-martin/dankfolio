import React from 'react'; // Removed useRef, useEffect
import { View, TouchableOpacity, Linking } from 'react-native'; // Removed Dimensions
import { Text, Icon } from 'react-native-paper';
// BottomSheet specific imports will be handled by ManagedBottomSheetModal
import { LoadingAnimation } from '../../Common/Animations';
import { TradeConfirmationProps } from './types';
import ManagedBottomSheetModal from '@/components/Common/BottomSheet/ManagedBottomSheetModal'; // Import new modal
import { useStyles } from './styles';
import { Coin } from '@/types';
import CachedImage from '@/components/Common/CachedImage';
import { formatPrice, formatAddress as utilFormatAddress } from '@/utils/numberFormat';
import ModalActionButtons from '@/components/Common/ModalActionButtons'; // Import ModalActionButtons

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
	operationType = 'swap',
	recipientAddress,
}) => {
	const styles = useStyles();
	// bottomSheetModalRef and useEffect for visibility are now handled by ManagedBottomSheetModal
	// renderBackdrop is also handled by ManagedBottomSheetModal by default

	const TokenIcon: React.FC<{ token: Coin }> = ({ token }) => {
		const placeholderIconStyle = React.useMemo(() => [
			styles.tokenIcon,
			styles.tokenIconPlaceholderBg // Use new style from stylesheet
		], [styles.tokenIcon, styles.tokenIconPlaceholderBg]);

		if (!token.resolvedIconUrl) {
			return <View style={placeholderIconStyle} />; // Applied
		}
		return (
			<CachedImage
				uri={token.resolvedIconUrl}
				size={32}
				style={styles.tokenIcon}
				showLoadingIndicator={true}
				borderRadius={16}
			/>
		);
	};

	const handleSolscanPress = () => {
		if (recipientAddress) {
			const solscanUrl = `https://solscan.io/account/${recipientAddress}`;
			Linking.openURL(solscanUrl);
		}
	};

	// const formatAddress = (address: string) => { // Removed local implementation
	// 	if (address.length <= 12) return address;
	// 	return `${address.slice(0, 6)}...${address.slice(-6)}`;
	// };

	const renderTokenRow = (
		token: Coin,
		amount: string,
		testIdPrefix: string,
		isRecipient = false
	) => {
		const recipientAddressTextStyle = React.useMemo(() => [
			styles.tokenName,
			styles.recipientAddressLink,
			styles.primaryColorText // Use new style from stylesheet
		], [styles.tokenName, styles.recipientAddressLink, styles.primaryColorText]);

		const solscanTextStyle = React.useMemo(() => [
			styles.solscanText,
			styles.primaryColorText // Use new style from stylesheet
		], [styles.solscanText, styles.primaryColorText]);

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
								<Text style={recipientAddressTextStyle}>
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
						<Text style={solscanTextStyle}>Solscan</Text>
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
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.loadingContainer}>
					<LoadingAnimation size={100} />
					<Text style={styles.loadingText}>{loadingText}</Text>
				</View>
			</View>
		);
	};

	const renderContent = () => {
		const isSend = operationType === 'send';

		// Check if we have required data
		if (isSend && (!fromToken || !recipientAddress)) {
			return renderLoadingState();
		}
		if (!isSend && (!fromToken || !toToken)) {
			return renderLoadingState();
		}

		return (
			<View style={styles.container}>
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

				{/* Network Fee */}
				<View style={styles.feeContainer} testID="fee-section">
					<Text style={styles.feeLabel} testID="fee-label">Network Fee</Text>
					<Text style={styles.feeValue} testID="fee-value">{formatPrice(Number(fees.totalFee))}</Text>
				</View>

				{/* Action Buttons */}
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

