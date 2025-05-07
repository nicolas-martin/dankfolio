import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { usePortfolioStore } from '@store/portfolio';
import TokenSelector from 'components/Common/TokenSelector';
import { useToast } from '@components/Common/Toast';
import { SendTokensScreenProps } from './types';
import { PortfolioToken } from '@store/portfolio';
import {
	validateForm,
	handleTokenTransfer,
	handleTokenSelect,
	getDefaultSolanaToken
} from './scripts';
import { createStyles } from './styles';
import { Coin } from '@/types';

const SendTokensScreen: React.FC<SendTokensScreenProps> = ({ navigation }) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { wallet, tokens } = usePortfolioStore();
	const { showToast } = useToast();
	const [selectedToken, setSelectedToken] = useState<PortfolioToken | undefined>(undefined);
	const [amount, setAmount] = useState('');
	const [recipientAddress, setRecipientAddress] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Initialize with SOL token
	useEffect(() => {
		if (tokens.length > 0 && !selectedToken) {
			const solToken = getDefaultSolanaToken(tokens);
			if (solToken) {
				setSelectedToken(solToken);
			}
		}
	}, [tokens]);

	// Error handling effect
	useEffect(() => {
		if (!wallet) {
			showToast({
				type: 'error',
				message: 'No wallet connected'
			});
			return;
		}

		if (tokens.length === 0) {
			showToast({
				type: 'error',
				message: 'No tokens in portfolio'
			});
			return;
		}
	}, [wallet, tokens, showToast]);

	const onTokenSelect = (coin: Coin) => {
		const portfolioToken = handleTokenSelect(coin, tokens);
		setSelectedToken(portfolioToken);
	};

	const handleSubmit = async () => {
		try {
			if (!wallet) {
				showToast({
					type: 'error',
					message: 'No wallet connected'
				});
				return;
			}
			if (!selectedToken) {
				showToast({
					type: 'error',
					message: 'No token selected'
				});
				return;
			}

			setIsLoading(true);

			const validationError = await validateForm({
				toAddress: recipientAddress,
				amount,
				selectedTokenMint: selectedToken.mintAddress
			}, selectedToken);

			if (validationError) {
				showToast({
					type: 'error',
					message: validationError
				});
				setIsLoading(false);
				return;
			}

			const txHash = await handleTokenTransfer({
				toAddress: recipientAddress,
				amount,
				selectedTokenMint: selectedToken.mintAddress
			});

			console.log('Transaction submitted:', txHash);
			showToast({
				type: 'success',
				message: 'Transaction submitted successfully'
			});
			navigation.goBack();
		} catch (err) {
			showToast({
				type: 'error',
				message: err.message || 'Failed to send tokens'
			});
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
	if (!selectedToken) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={styles.title}>No token selected</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.contentPadding}>
				<Text style={styles.title}>Send Tokens</Text>

				<TokenSelector
					style={styles.inputContainer}
					selectedToken={selectedToken.coin}
					onSelectToken={onTokenSelect}
					label="Select token to send"
					amountValue={amount}
					onAmountChange={setAmount}
					isAmountEditable={true}
					showOnlyPortfolioTokens={true}
				/>

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
