import React, { useEffect, useState, useRef } from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { TradeConfirmationProps } from './types';
import { createStyles } from './styles';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
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
	const { getCoinByID } = useCoinStore();
	const { showToast } = useToast();
	const [latestFromCoin, setLatestFromCoin] = useState<Coin>();
	const [latestToCoin, setLatestToCoin] = useState<Coin>();
	const hasRefreshedRef = useRef(false);

	// Reset the ref when modal closes
	useEffect(() => {
		if (!isVisible) {
			hasRefreshedRef.current = false;
		}
	}, [isVisible]);

	// Refresh prices when modal becomes visible
	useEffect(() => {
		const refreshPrices = async () => {
			if (!isVisible || hasRefreshedRef.current) return;

			try {
				hasRefreshedRef.current = true;
				if (!fromCoin || !toCoin) {
					throw new Error('Coin data is missing');
				}

				const [updatedFromCoin, updatedToCoin] = await Promise.all([
					getCoinByID(fromCoin.id, true),
					getCoinByID(toCoin.id, true)
				]);

				if (!updatedFromCoin || !updatedToCoin) {
					throw new Error('Failed to fetch updated coin data');
				}

				setLatestFromCoin(updatedFromCoin);
				setLatestToCoin(updatedToCoin);
			} catch (error) {
				console.error('Failed to refresh coin prices:', error);
				showToast({
					type: 'error',
					message: 'Failed to refresh prices. Please try again later.'
				});
				onClose(); // Close modal on error
			}
		};

		refreshPrices();
	}, [isVisible, fromCoin?.id, toCoin?.id, getCoinByID, onClose, showToast]);

	const calculateValue = (amount: string, coin: Coin): string => {
		if (!coin || !amount || isNaN(parseFloat(amount))) return '$0.00';
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

	if (!latestFromCoin || !latestToCoin) {
		// Return a loading state or null while data is being fetched
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

	// If we've reached this point, latestFromCoin and latestToCoin are defined.
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
					{renderRow('Amount', `${fromAmount} ${latestFromCoin.symbol}`)}
					{renderRow('Value', calculateValue(fromAmount, latestFromCoin))}
				</View>

				<View style={styles.section}>
					<Text style={styles.label}>You Receive</Text>
					{renderRow('Amount', `${toAmount} ${latestToCoin.symbol}`)}
					{renderRow('Value', calculateValue(toAmount, latestToCoin))}
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
