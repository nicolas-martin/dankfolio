import React from 'react';
import { View, Text, Image, TextInput, Platform } from 'react-native';
import { ActivityIndicator, Card } from 'react-native-paper';
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
	const { walletBalance } = usePortfolioStore();

	const renderCoinItem = () => {
		if (!selectedCoin) {
			return (
				<View style={styles.coinContainer}>
					<Text style={styles.placeholderText}>Select coin</Text>
				</View>
			);
		}

		const { balance, value } = renderCoinBalance(selectedCoin, walletBalance);

		return (
			<View style={styles.coinContainer}>
				<View style={styles.leftSection}>
					<Image
						source={{ uri: getCoinIcon(selectedCoin) }}
						style={styles.coinIcon}
						defaultSource={{ uri: DEFAULT_ICON }}
					/>
					<View style={styles.coinInfo}>
						<Text style={styles.coinSymbol}>{selectedCoin.symbol}</Text>
						<Text style={styles.coinName}>{selectedCoin.name}</Text>
					</View>
				</View>
				<View style={styles.balanceSection}>
					<Text style={styles.balanceText}>{balance}</Text>
					<Text style={styles.valueText}>${value.toFixed(4)}</Text>
				</View>
			</View>
		);
	};

	const renderAmount = () => {
		if (isInput) {
			return (
				<TextInput
					style={styles.amountInput}
					value={amount}
					onChangeText={onAmountChange}
					placeholder="0.00"
					placeholderTextColor={theme.colors.textSecondary}
					selectionColor={theme.colors.primary}
					ref={inputRef}
					autoCorrect={false}
					spellCheck={false}
					autoCapitalize="none"
					onBlur={(e) => e.preventDefault()}
					keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
				/>
			);
		}

		return (
			<View style={styles.toAmountContainer}>
				{isAmountLoading ? (
					<ActivityIndicator size="small" color={theme.colors.primary} />
				) : (
					<Text style={styles.toAmount}>{amount || '0.00'}</Text>
				)}
			</View>
		);
	};

	return (
		<Card style={styles.container}>
			<Card.Content>
				<Text style={styles.label}>{label}</Text>
				<View style={styles.coinSelector}>
					{renderCoinItem()}
				</View>
				{renderAmount()}
				{(approxValue || rateText) && (
					<View style={styles.valueHintContainer}>
						{approxValue && <Text style={styles.approxValueText}>{approxValue}</Text>}
						{rateText && <Text style={styles.rateText}>{rateText}</Text>}
					</View>
				)}
			</Card.Content>
		</Card>
	);
};

export default CoinSelector;
