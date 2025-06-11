import React, { useRef, useEffect } from 'react';
import { View, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Text, Button, useTheme, Icon } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { LoadingAnimation } from '../../Common/Animations';
import { TradeConfirmationProps } from './types';
import { createStyles } from './styles';
import { Coin } from '@/types';
import CachedImage from '@/components/Common/CachedImage';
import { formatPrice } from '@/utils/numberFormat';

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
	const theme = useTheme();
	const styles = createStyles(theme);
	const bottomSheetModalRef = useRef<BottomSheetModal>(null);

	useEffect(() => {
		if (isVisible) {
			bottomSheetModalRef.current?.present();
		} else {
			bottomSheetModalRef.current?.dismiss();
		}
	}, [isVisible]);

	// Custom backdrop component with blur
	const renderBackdrop = (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
		<BottomSheetBackdrop
			{...props}
			disappearsOnIndex={-1}
			appearsOnIndex={0}
			opacity={0.8}
			onPress={onClose}
			// Accessibility properties for testing frameworks
			accessible={true}
			accessibilityRole="button"
			accessibilityLabel="Close trade confirmation modal"
			accessibilityHint="Tap to close the modal"
		>
			<BlurView intensity={20} style={styles.blurViewStyle} />
		</BottomSheetBackdrop>
	);

	const TokenIcon: React.FC<{ token: Coin }> = ({ token }) => {
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

	const formatAddress = (address: string) => {
		if (address.length <= 12) return address;
		return `${address.slice(0, 6)}...${address.slice(-6)}`;
	};

	const renderTokenRow = (
		token: Coin,
		amount: string,
		testIdPrefix: string,
		isRecipient = false
	) => (
		<View style={styles.tradeRow} testID={`${testIdPrefix}-token-details`}>
			<View style={styles.tokenInfo}>
				{isRecipient ? (
					<Icon source="account" size={32} color={theme.colors.onSurfaceVariant} />
				) : (
					<TokenIcon token={token} />
				)}
				<View style={styles.tokenDetails}>
					{isRecipient ? (
						<>
							<Text style={styles.tokenSymbol}>To</Text>
							<TouchableOpacity onPress={handleSolscanPress} testID="solscan-link">
								<Text style={[styles.tokenName, styles.recipientAddressLink, { color: theme.colors.primary }]}>
									{formatAddress(amount)}
								</Text>
							</TouchableOpacity>
						</>
					) : (
						<>
							<Text style={styles.tokenSymbol} testID={`${testIdPrefix}-token-symbol-${token.mintAddress}`}>
								{token.symbol}
							</Text>
							<Text style={styles.tokenName} testID={`${testIdPrefix}-token-name-${token.mintAddress}`}>
								{token.name}
							</Text>
						</>
					)}
				</View>
			</View>
			<View style={styles.amountInfo}>
				{isRecipient ? (
					<TouchableOpacity onPress={handleSolscanPress} style={styles.solscanButton} testID="solscan-button">
						<Icon source="open-in-new" size={16} color={theme.colors.primary} />
						<Text style={[styles.solscanText, { color: theme.colors.primary }]}>Solscan</Text>
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

	const renderActionButtons = () => {
		const cancelTestId = `cancel-${operationType}-button`;
		const confirmTestId = `confirm-${operationType}-button`;
		const actionLabel = operationType;

		return (
			<View style={styles.buttonContainer}>
				<Button
					mode="outlined"
					onPress={onClose}
					style={styles.cancelButton}
					labelStyle={styles.cancelButtonLabel}
					disabled={isLoading}
					testID={cancelTestId}
					accessible={true}
					accessibilityRole="button"
					accessibilityLabel={`Cancel ${actionLabel}`}
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
					testID={confirmTestId}
					accessible={true}
					accessibilityRole="button"
					accessibilityLabel={isLoading ? `Processing ${actionLabel}` : `Confirm ${actionLabel}`}
				>
					{isLoading ? 'Processing...' : 'Confirm'}
				</Button>
			</View>
		);
	};

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
				{renderActionButtons()}
			</View>
		);
	};

	return (
		<BottomSheetModal
			ref={bottomSheetModalRef}
			snapPoints={[Dimensions.get('window').height * 0.95]}
			onDismiss={onClose}
			backgroundStyle={styles.bottomSheetBackground}
			handleIndicatorStyle={styles.handleIndicator}
			enablePanDownToClose={true}
			enableDismissOnClose={true}
			backdropComponent={renderBackdrop}
			// Official Maestro solution for nested components on iOS
			// Disable accessibility on the outer container to allow inner components to be accessible
			accessible={false}
		>
			<BottomSheetView 
				style={styles.blurViewStyle}
				// Parent container should be accessible={false}
				accessible={false}
				// Android specific - ensure content is accessible
				importantForAccessibility="yes"
			>
				{renderContent()}
			</BottomSheetView>
		</BottomSheetModal>
	);
};

export default TradeConfirmation;

