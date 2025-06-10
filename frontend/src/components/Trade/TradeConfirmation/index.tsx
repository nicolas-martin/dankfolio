import React, { useRef, useEffect } from 'react';
import { View, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Text, Button, useTheme, Icon } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { LoadingAnimation } from '../../Common/Animations';
import { TradeConfirmationProps } from './types';
import { createStyles } from './styles';
import { Coin } from '@/types';
import { CachedImage } from '@/components/Common/CachedImage';
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

	const renderSendContent = () => {
		if (!fromToken || !recipientAddress) {
			return (
				<View style={styles.container}>
					<Text style={styles.title}>Confirm Send</Text>
					<View style={styles.loadingContainer}>
						<LoadingAnimation size={100} />
						<Text style={styles.loadingText}>Preparing send...</Text>
					</View>
				</View>
			);
		}

		return (
			<View style={styles.container}>
				{/* Send Display */}
				<View style={styles.tradeContainer}>
					{/* Token Amount */}
					<View style={styles.tradeRow} testID="send-token-details">
						<View style={styles.tokenInfo}>
							<TokenIcon token={fromToken} />
							<View style={styles.tokenDetails}>
								<Text style={styles.tokenSymbol} testID={`send-token-symbol-${fromToken.mintAddress}`}>{fromToken.symbol}</Text>
								<Text style={styles.tokenName} testID={`send-token-name-${fromToken.mintAddress}`}>{fromToken.name}</Text>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<Text style={styles.amount} testID="send-token-amount">
								{isNaN(Number(fromAmount)) ? '0' : fromAmount}
							</Text>
							<Text style={styles.amountUsd} testID="send-token-amount-usd">
								{formatPrice(isNaN(Number(fromAmount)) ? 0 : Number(fromAmount) * (fromToken.price || 0))}
							</Text>
						</View>
					</View>

					{/* Divider */}
					<View style={styles.divider} />

					{/* Recipient Address */}
					<View style={styles.tradeRow} testID="recipient-details">
						<View style={styles.tokenInfo}>
							<Icon source="account" size={32} color={theme.colors.onSurfaceVariant} />
							<View style={styles.tokenDetails}>
								<Text style={styles.tokenSymbol}>To</Text>
								<TouchableOpacity onPress={handleSolscanPress} testID="solscan-link">
									<Text style={[styles.tokenName, styles.recipientAddressLink, { color: theme.colors.primary }]}>
										{formatAddress(recipientAddress)}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<TouchableOpacity onPress={handleSolscanPress} style={styles.solscanButton} testID="solscan-button">
								<Icon source="open-in-new" size={16} color={theme.colors.primary} />
								<Text style={[styles.solscanText, { color: theme.colors.primary }]}>Solscan</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* Network Fee */}
				<View style={styles.feeContainer} testID="fee-section">
					<Text style={styles.feeLabel} testID="fee-label">Network Fee</Text>
					<Text style={styles.feeValue} testID="fee-value">{formatPrice(Number(fees.totalFee))}</Text>
				</View>

				{/* Action Buttons */}
				<View style={styles.buttonContainer}>
					<Button
						mode="outlined"
						onPress={onClose}
						style={styles.cancelButton}
						labelStyle={styles.cancelButtonLabel}
						disabled={isLoading}
						testID="cancel-send-button"
						accessible={true}
						accessibilityRole="button"
						accessibilityLabel="Cancel send"
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
						testID="confirm-send-button"
						accessible={true}
						accessibilityRole="button"
						accessibilityLabel={isLoading ? "Processing send" : "Confirm send"}
					>
						{isLoading ? 'Processing...' : 'Confirm'}
					</Button>
				</View>
			</View>
		);
	};

	const renderSwapContent = () => {
		if (!fromToken || !toToken) {
			return (
				<View style={styles.container}>
					<Text style={styles.title}>Confirm Trade</Text>
					<View style={styles.loadingContainer}>
						<LoadingAnimation size={100} />
						<Text style={styles.loadingText}>Preparing trade...</Text>
					</View>
				</View>
			);
		}

		return (
			<View style={styles.container}>
				{/* Trade Display */}
				<View style={styles.tradeContainer}>
					{/* From Amount */}
					<View style={styles.tradeRow} testID="from-token-details">
						<View style={styles.tokenInfo}>
							<TokenIcon token={fromToken} />
							<View style={styles.tokenDetails}>
								<Text style={styles.tokenSymbol} testID={`from-token-symbol-${fromToken.mintAddress}`}>{fromToken.symbol}</Text>
								<Text style={styles.tokenName} testID={`from-token-name-${fromToken.mintAddress}`}>{fromToken.name}</Text>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<Text style={styles.amount} testID="from-token-amount">
								{isNaN(Number(fromAmount)) ? '0' : fromAmount}
							</Text>
							<Text style={styles.amountUsd} testID="from-token-amount-usd">
								{formatPrice(isNaN(Number(fromAmount)) ? 0 : Number(fromAmount) * (fromToken.price || 0))}
							</Text>
						</View>
					</View>

					{/* Divider */}
					<View style={styles.divider} />

					{/* To Amount */}
					<View style={styles.tradeRow} testID="to-token-details">
						<View style={styles.tokenInfo}>
							<TokenIcon token={toToken} />
							<View style={styles.tokenDetails}>
								<Text style={styles.tokenSymbol} testID={`to-token-symbol-${toToken.mintAddress}`}>{toToken.symbol}</Text>
								<Text style={styles.tokenName} testID={`to-token-name-${toToken.mintAddress}`}>{toToken.name}</Text>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<Text style={styles.amount} testID="to-token-amount">
								{isNaN(Number(toAmount)) ? '0' : toAmount}
							</Text>
							<Text style={styles.amountUsd} testID="to-token-amount-usd">
								{formatPrice(isNaN(Number(toAmount)) ? 0 : Number(toAmount) * (toToken.price || 0))}
							</Text>
						</View>
					</View>
				</View>

				{/* Network Fee */}
				<View style={styles.feeContainer} testID="fee-section">
					<Text style={styles.feeLabel} testID="fee-label">Network Fee</Text>
					<Text style={styles.feeValue} testID="fee-value">{formatPrice(Number(fees.totalFee))}</Text>
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
						accessible={true}
						accessibilityRole="button"
						accessibilityLabel="Cancel trade"
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
						accessible={true}
						accessibilityRole="button"
						accessibilityLabel={isLoading ? "Processing trade" : "Confirm trade"}
					>
						{isLoading ? 'Processing...' : 'Confirm'}
					</Button>
				</View>
			</View>
		);
	};

	const renderContent = () => {
		return operationType === 'send' ? renderSendContent() : renderSwapContent();
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

