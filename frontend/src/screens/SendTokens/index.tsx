import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { usePortfolioStore } from '@store/portfolio';
import TokenSelector from '@components/TokenSelector';
import { TokenTransferFormData, SendTokensScreenProps } from './types';
import { PortfolioToken } from '@store/portfolio';
import { validateForm, handleTokenTransfer, formatTokenBalance } from './scripts';
import { createStyles } from './styles';

const SendTokensScreen: React.FC<SendTokensScreenProps> = ({ navigation }) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { wallet, tokens } = usePortfolioStore();
	const [selectedToken, setSelectedToken] = useState<PortfolioToken | undefined>(undefined);
	const [amount, setAmount] = useState('');
	const [recipientAddress, setRecipientAddress] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// on mount, fetch tokens
	useEffect(() => {
		if (!wallet) {
			setError('No wallet connected');
			return;
		}

		if (tokens.length === 0) {
			setError('No tokens in portfolio');
			return;
		}
	});

	const handleSubmit = async () => {
		try {
			if (!wallet) {
				setError('No wallet connected');
				return;
			}

			setError(null);
			setIsLoading(true);

			const validationError = await validateForm({
				toAddress: recipientAddress,
				amount,
				selectedToken: selectedToken?.id
			}, selectedToken);

			if (validationError) {
				setError(validationError);
				setIsLoading(false);
				return;
			}

			const txHash = await handleTokenTransfer({
				toAddress: recipientAddress,
				amount,
				selectedToken: selectedToken?.id
			}, wallet);

			console.log('Transaction submitted:', txHash);
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

				<Card elevation={0} style={styles.inlineCard}>
					<Card.Content style={styles.inlineContainer}>
						<View style={styles.inlineSelectorContainer}>
							<TokenSelector
								selectedToken={selectedToken}
								tokens={tokens}
								onSelectToken={setSelectedToken}
								label="Select token to send"
							/>
						</View>
						<View style={styles.inputWithValueContainer}>
							<TextInput
								style={styles.inlineInput}
								value={amount}
								onChangeText={(text) => setAmount(text)}
								placeholder="0.00"
								placeholderTextColor={theme.colors.onSurfaceVariant}
								keyboardType="decimal-pad"
							/>
							<Text style={styles.inlineValueText}>
								{`$${selectedToken && amount ? (parseFloat(amount) * selectedToken.price).toFixed(2) : '0.00'}`}
							</Text>
						</View>
					</Card.Content>
				</Card>

				{selectedToken && (
					<View style={styles.percentageContainer}>
						{[10, 25, 50, 75, 100].map((percent) => (
							<TouchableOpacity
								key={percent}
								style={styles.percentageButton}
								onPress={() => {
									const calculatedAmount = (selectedToken.amount * percent) / 100;
									let amountStr = calculatedAmount.toFixed(9);
									amountStr = parseFloat(amountStr).toString();
									if (amountStr.length > 12) {
										amountStr = amountStr.substring(0, 12);
										if (amountStr.endsWith('.')) {
											amountStr = amountStr.substring(0, 11);
										}
									}
									setAmount(amountStr);
								}}
							>
								<Text style={styles.percentageButtonText}>{percent}%</Text>
							</TouchableOpacity>
						))}
					</View>
				)}

				<View style={styles.inputContainer}>
					<Text style={styles.label}>Recipient Address</Text>
					<TextInput
						style={styles.input}
						value={recipientAddress}
						onChangeText={(text) => setRecipientAddress(text)}
						placeholder="Enter recipient's address"
						placeholderTextColor={theme.colors.onSurfaceVariant}
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