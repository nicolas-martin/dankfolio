import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { usePortfolioStore } from '@store/portfolio';
import { TokenTransferFormData, SendTokensScreenProps } from './types';
import { validateForm, handleTokenTransfer, formatTokenBalance } from './scripts';
import { createStyles } from './styles';
import { Dropdown } from 'react-native-paper-dropdown';

const SendTokensScreen: React.FC<SendTokensScreenProps> = ({ navigation }) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { wallet, tokens } = usePortfolioStore();
	const [showDropDown, setShowDropDown] = useState(false);

	const [formData, setFormData] = useState<TokenTransferFormData>({
		toAddress: '',
		amount: '',
		selectedToken: ''
	});
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const tokenOptions = tokens.map(token => ({
		label: `${token.coin.symbol} - ${formatTokenBalance(token.amount)}`,
		value: token.id
	}));

	const handleSubmit = async () => {
		try {
			if (!wallet) {
				setError('No wallet connected');
				return;
			}

			setError(null);
			setIsLoading(true);

			const validationError = validateForm(formData);
			if (validationError) {
				setError(validationError);
				return;
			}

			const txHash = await handleTokenTransfer(formData, wallet);
			console.log('Transaction submitted:', txHash);

			// Navigate back or to transaction status screen
			navigation.goBack();
		} catch (err) {
			setError(err.message || 'Failed to send tokens');
		} finally {
			setIsLoading(false);
		}
	};

	if (!wallet) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={styles.title}>No Wallet Connected</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.contentPadding}>
				<Text style={styles.title}>Send Tokens</Text>

				<View style={styles.inputContainer}>
					<Text style={styles.label}>Recipient Address</Text>
					<TextInput
						style={styles.input}
						value={formData.toAddress}
						onChangeText={(text) => setFormData({ ...formData, toAddress: text })}
						placeholder="Enter recipient's address"
						placeholderTextColor={theme.colors.onSurfaceVariant}
					/>
				</View>

				<View style={styles.inputContainer}>
					<Text style={styles.label}>Amount</Text>
					<TextInput
						style={styles.input}
						value={formData.amount}
						onChangeText={(text) => setFormData({ ...formData, amount: text })}
						placeholder="0.00"
						placeholderTextColor={theme.colors.onSurfaceVariant}
						keyboardType="decimal-pad"
					/>
				</View>

				<View style={styles.inputContainer}>
					<Dropdown
						label="Select Token"
						mode="outlined"
						options={tokenOptions}
						value={formData.selectedToken}
						onSelect={(value: string) => setFormData({ ...formData, selectedToken: value })}
					/>
				</View>

				{error && <Text style={styles.errorText}>{error}</Text>}

				<TouchableOpacity
					onPress={handleSubmit}
					disabled={isLoading}
					style={[styles.button, isLoading && styles.buttonDisabled]}
				>
					<Text style={styles.buttonText}>
						{isLoading ? 'Sending...' : 'Send Tokens'}
					</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
};

export default SendTokensScreen; 