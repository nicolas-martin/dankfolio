import React from 'react';
import { View, Image, Platform } from 'react-native';
import { ActivityIndicator, Card, TextInput, Text } from 'react-native-paper';
import { theme } from '../../../utils/theme';
import { CoinSelectorProps } from './types';
import { styles } from './coinselector_styles';
import { DEFAULT_ICON, getCoinIcon, renderCoinBalance } from './coinselector_scripts';
import { usePortfolioStore } from '../../../store/portfolio';

const CoinSelector: React.FC<CoinSelectorProps> = ({
	label,
	selectedCoin,
	amount,
	isAmountLoading,
	onAmountChange,
	isInput = false,
	inputRef,
	approxValue,
	rateText,
}) => {
	const { portfolio } = usePortfolioStore();

	const renderCoinItem = () => {
		if (!selectedCoin) {
			return (
				<View style={styles.coinContainer}>
					<Text variant="bodyMedium" style={styles.placeholderText}>Select coin</Text>
				</View>
			);
		}

		const { balance, value } = renderCoinBalance(selectedCoin, portfolio);

		return (
			<View style={styles.coinContainer}>
				<View style={styles.leftSection}>
					<Image
						source={{ uri: getCoinIcon(selectedCoin) }}
						style={styles.coinIcon}
						defaultSource={{ uri: DEFAULT_ICON }}
					/>
					<View style={styles.coinInfo}>
						<Text variant="titleMedium" style={styles.coinSymbol}>{selectedCoin.symbol}</Text>
						<Text variant="bodySmall" style={styles.coinName}>{selectedCoin.name}</Text>
					</View>
				</View>
				<View style={styles.balanceSection}>
					<Text variant="bodyMedium" style={styles.balanceText}>{balance}</Text>
					<Text variant="bodySmall" style={styles.valueText}>${value.toFixed(4)}</Text>
				</View>
			</View>
		);
	};

	const renderAmount = () => {
		if (isInput) {
			return (
				<TextInput
					mode="outlined"
					style={styles.amountInput}
					value={amount}
					onChangeText={(text) => {
						// Only allow digits and one decimal point
						const regex = /^\d*\.?\d*$/;
						if ((regex.test(text) || text === '') && onAmountChange) {
							onAmountChange(text);
						}
					}}
					placeholder="0.00"
					placeholderTextColor={theme.colors.textSecondary}
					selectionColor={theme.colors.primary}
					ref={inputRef}
					autoCorrect={false}
					autoCapitalize="none"
					keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
					activeOutlineColor={theme.colors.primary}
					outlineColor={theme.colors.textSecondary}
					textColor={theme.colors.onSurface}
					right={<TextInput.Affix text={selectedCoin?.symbol} />}
				/>
			);
		}

		return (
			<View style={styles.toAmountContainer}>
				{isAmountLoading ? (
					<ActivityIndicator size="small" color={theme.colors.primary} />
				) : (
					<Text variant="headlineMedium" style={styles.toAmount}>{amount || '0.00'}</Text>
				)}
			</View>
		);
	};

	return (
		<Card style={styles.container}>
			<Card.Content>
				<Text variant="labelLarge" style={styles.label}>{label}</Text>
				<View style={styles.coinSelector}>
					{renderCoinItem()}
				</View>
				{renderAmount()}
				{(approxValue || rateText) && (
					<View style={styles.valueHintContainer}>
						{approxValue && <Text variant="bodySmall" style={styles.approxValueText}>{approxValue}</Text>}
						{rateText && <Text variant="bodySmall" style={styles.rateText}>{rateText}</Text>}
					</View>
				)}
			</Card.Content>
		</Card>
	);
};

export default CoinSelector;
