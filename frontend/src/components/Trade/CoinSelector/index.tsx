import React from 'react';
import { View, Image, Platform } from 'react-native';
import { Card, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { CoinSelectorProps } from './types';
import { styles } from './coinselector_styles';
import { DEFAULT_ICON, getCoinIcon } from './coinselector_scripts';
import { theme } from '../../../utils/theme';

const CoinSelector: React.FC<CoinSelectorProps> = ({
	label,
	coinData,
	amount,
	isInput = false,
	inputRef
}) => {
	const { coin, balance } = coinData;

	const calculateDollarValue = (amountStr: string): string => {
		if (!amountStr || !coin?.price) return '$0.00';
		const numericAmount = parseFloat(amountStr);
		if (isNaN(numericAmount)) return '$0.00';
		return `$${(numericAmount * coin.price).toFixed(4)}`;
	};

	const renderAmount = () => {
		if (isInput) {
			return (
				<View>
					<TextInput
						ref={inputRef}
						mode="outlined"
						style={styles.amountInput}
						value={amount.value}
						onChangeText={(text) => {
							// Only allow digits and one decimal point
							const regex = /^\d*\.?\d*$/;
							if ((regex.test(text) || text === '') && amount.onChange) {
								amount.onChange(text);
							}
						}}
						placeholder="0.00"
						placeholderTextColor={theme.colors.textSecondary}
						selectionColor={theme.colors.primary}
						autoCorrect={false}
						autoCapitalize="none"
						keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
						activeOutlineColor={theme.colors.primary}
						outlineColor={theme.colors.textSecondary}
						textColor={theme.colors.onSurface}
						right={<TextInput.Affix text={coin.symbol} />}
					/>
					<Text style={styles.dollarValue}>
						{calculateDollarValue(amount.value)}
					</Text>
				</View>
			);
		}

		return (
			<View style={styles.toAmountContainer}>
				{amount.isLoading ? (
					<ActivityIndicator size="small" color={theme.colors.primary} />
				) : (
					<>
						<Text variant="headlineMedium" style={styles.toAmount}>{amount.value || '0.00'}</Text>
						<Text style={styles.dollarValue}>
							{calculateDollarValue(amount.value)}
						</Text>
					</>
				)}
			</View>
		);
	};

	return (
		<Card style={styles.container}>
			<Card.Content>
				<Text variant="labelLarge" style={styles.label}>{label}</Text>
				<View style={styles.coinSelector}>
					<View style={styles.coinContainer}>
						<View style={styles.leftSection}>
							<Image
								source={{ uri: getCoinIcon(coin) }}
								style={styles.coinIcon}
								defaultSource={{ uri: DEFAULT_ICON }}
							/>
							<View style={styles.coinInfo}>
								<Text variant="titleMedium" style={styles.coinSymbol}>{coin.symbol}</Text>
								<Text variant="bodySmall" style={styles.coinName}>{coin.name}</Text>
							</View>
						</View>
						{balance && (
							<View style={styles.balanceSection}>
								<Text variant="bodyMedium" style={styles.balanceText}>
									{balance.amount.toFixed(6)} {coin.symbol}
								</Text>
								{balance.value && (
									<Text variant="bodySmall" style={styles.valueText}>
										${balance.value.toFixed(4)}
									</Text>
								)}
							</View>
						)}
					</View>
				</View>
				{renderAmount()}
			</Card.Content>
		</Card>
	);
};

export default CoinSelector;
