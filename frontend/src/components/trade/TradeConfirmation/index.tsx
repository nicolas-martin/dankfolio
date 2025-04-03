import React from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, Button, useTheme } from 'react-native-paper';
import { TradeConfirmationProps } from './types';
import { createStyles } from './styles';

const TradeConfirmation: React.FC<TradeConfirmationProps> = ({
	isVisible,
	onClose,
	onConfirm,
	fromCoin,
	toCoin,
	fees,
	isLoading = false,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const renderRow = (label: string, value: string, subValue?: string) => (
		<View style={styles.row}>
			<Text style={styles.label}>{label}</Text>
			<View style={styles.valueContainer}>
				<Text style={styles.value}>{value}</Text>
				{subValue && <Text style={styles.subValue}>{subValue}</Text>}
			</View>
		</View>
	);

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
					{renderRow('Amount', `${fromCoin.amount} ${fromCoin.symbol}`)}
					{renderRow('Value', fromCoin.value)}
				</View>

				<View style={styles.section}>
					<Text style={styles.label}>You Receive</Text>
					{renderRow('Amount', `${toCoin.amount} ${toCoin.symbol}`)}
					{renderRow('Value', toCoin.value)}
				</View>

				<View style={styles.divider} />

				<View style={styles.section}>
					<Text style={styles.label}>Transaction Details</Text>
					{renderRow('Network Fee', fees.gasFee, fees.gasFeeUSD)}
					{renderRow('Price Impact', `${roundedPriceImpact}%`)}
					{renderRow('Total Fee', fees.totalFee, fees.totalFeeUSD)}
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
					>
						Cancel
					</Button>
					<Button
						mode="contained"
						onPress={onConfirm}
						style={styles.button}
						loading={isLoading}
						disabled={isLoading}
					>
						Confirm
					</Button>
				</View>
			</Modal>
		</Portal>
	);
};

export default TradeConfirmation; 