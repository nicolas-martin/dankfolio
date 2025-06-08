import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
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

	const renderContent = () => {
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
								<Text style={styles.tokenSymbol}>{fromToken.symbol}</Text>
								<Text style={styles.tokenName}>{fromToken.name}</Text>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<Text style={styles.amount}>
								{isNaN(Number(fromAmount)) ? '0' : fromAmount}
							</Text>
							<Text style={styles.amountUsd}>
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
								<Text style={styles.tokenSymbol}>{toToken.symbol}</Text>
								<Text style={styles.tokenName}>{toToken.name}</Text>
							</View>
						</View>
						<View style={styles.amountInfo}>
							<Text style={styles.amount}>
								{isNaN(Number(toAmount)) ? '0' : toAmount}
							</Text>
							<Text style={styles.amountUsd}>
								{formatPrice(isNaN(Number(toAmount)) ? 0 : Number(toAmount) * (toToken.price || 0))}
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
						onPress={onClose} // This will now snap the sheet closed via useEffect
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
			</View>
		);
	};

	return (
		<BottomSheetModal
			ref={bottomSheetModalRef}
			snapPoints={['600']}
			onDismiss={onClose}
			backgroundStyle={{ backgroundColor: theme.colors.surface }}
			handleIndicatorStyle={{ backgroundColor: theme.colors.onSurface }}
			enablePanDownToClose={true}
			enableDismissOnClose={true}
			detached={false}
		>
			<BottomSheetView style={{ flex: 1 }}>
				{renderContent()}
			</BottomSheetView>
		</BottomSheetModal>
	);
};

export default TradeConfirmation;

