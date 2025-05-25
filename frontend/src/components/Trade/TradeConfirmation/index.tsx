import React from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { TradeConfirmationProps } from './types';
import { createStyles } from './styles';
// import { useToast } from '@components/Common/Toast'; // Kept in case of future use for other errors
import { Coin } from '@/types';

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

	const renderRow = (label: string, value: string, subValue?: string) => (
		<View style={styles.row}>
			<Text style={styles.label}>{label}</Text>
			<View style={styles.valueContainer}>
				<Text style={styles.value}>{value}</Text>
				{subValue && <Text style={styles.subValue}>{subValue}</Text>}
			</View>
		</View>
	);

	if (!fromCoin || !toCoin) {
		// Return a loading state or null while prop data is missing
		return (
			<Portal>
				<Modal visible={isVisible} onDismiss={onClose} contentContainerStyle={styles.container}>
					<Text style={styles.title}>Confirm Trade</Text>
					<View style={styles.loadingContainer}>
						<ActivityIndicator animating={true} testID="loading-spinner" />
					</View>
				</Modal>
			</Portal>
		);
	}

	// If we've reached this point, fromCoin and toCoin are defined.
	const roundedPriceImpact = parseFloat(fees.priceImpactPct).toFixed(4);

	return (
		<Portal>
			<Modal
				visible={isVisible}
				onDismiss={onClose}
				contentContainerStyle={styles.container}
			>
				<Text style={styles.title}>Confirm Trade</Text>

				<View style={styles.section}>
					<Text style={styles.label}>You Pay</Text>
					{renderRow('Amount', `${fromAmount} ${fromCoin.symbol}`)}
					{renderRow('Value', calculateValue(fromAmount, fromCoin))}
				</View>

				<View style={styles.section}>
					<Text style={styles.label}>You Receive</Text>
					{renderRow('Amount', `${toAmount} ${toCoin.symbol}`)}
					{renderRow('Value', calculateValue(toAmount, toCoin))}
				</View>

				<View style={styles.divider} />

				<View style={styles.section}>
					{renderRow('Price Impact', `${roundedPriceImpact}%`)}
					{renderRow('Total Fee', `$${fees.totalFee}`)}
				</View>

				{parseFloat(fees.priceImpactPct) > 2 && (
					<Text style={styles.warningText}>
						Warning: High price impact may result in unfavorable rates
					</Text>
				)}

				<View style={styles.buttonContainer}>
					<Button
						mode="outlined"
						onPress={onClose}
						style={styles.button}
						disabled={isLoading}
						testID="cancel-trade-button"
					>
						Cancel
					</Button>
					<Button
						mode="contained"
						onPress={onConfirm}
						style={styles.button}
						loading={isLoading}
						disabled={isLoading}
						testID="confirm-trade-button"
					>
						Confirm Trade
					</Button>
				</View>
			</Modal>
		</Portal>
	);
};

export default TradeConfirmation;
