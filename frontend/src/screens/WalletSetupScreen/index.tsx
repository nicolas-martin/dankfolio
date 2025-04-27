import React, { useState } from 'react';
import { View, Text, Button, TextInput, Alert, ActivityIndicator } from 'react-native';
import { styles } from './styles';
import { handleGenerateWallet, handleImportWallet } from './scripts';
import { WalletSetupScreenProps } from './types';
import { Keypair } from '@solana/web3.js';
import { useToast } from '@/components/Common/Toast';

const WalletSetupScreen = ({ onWalletSetupComplete }: WalletSetupScreenProps) => {
	const [mnemonic, setMnemonic] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const { showToast } = useToast();

	const generateWallet = async () => {
		setIsLoading(true);
		try {
			const keypair = await handleGenerateWallet();
			if (keypair) {
				showToast({ message: 'Wallet generated successfully!', type: 'success' });
				onWalletSetupComplete(keypair);
			} else {
				showToast({ message: 'Failed to generate wallet. Please try again.', type: 'error' });
			}
		} catch (err: any) {
			console.error("Generate Wallet Error:", err);
			showToast({ message: err.message || 'Error generating wallet.', type: 'error' });
		} finally {
			setIsLoading(false);
		}
	};

	const importWallet = async () => {
		if (!mnemonic.trim()) {
			Alert.alert('Missing Mnemonic', 'Please enter your 12 or 24-word mnemonic phrase.');
			return;
		}
		setIsLoading(true);
		try {
			const wordCount = mnemonic.trim().split(/\s+/).length;
			if (wordCount !== 12 && wordCount !== 24) {
				throw new Error('Mnemonic must be 12 or 24 words.');
			}

			const keypair = await handleImportWallet(mnemonic.trim());
			if (keypair) {
				showToast({ message: 'Wallet imported successfully!', type: 'success' });
				onWalletSetupComplete(keypair);
			} else {
				showToast({ message: 'Failed to import wallet. Please try again.', type: 'error' });
			}
		} catch (err: any) {
			console.error("Import Wallet Error:", err);
			showToast({ message: err.message || 'Error importing wallet.', type: 'error' });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Wallet Setup</Text>

			{isLoading && <ActivityIndicator size="large" style={{ marginBottom: 20 }} />}

			<Button title="Generate New Wallet" onPress={generateWallet} disabled={isLoading} />

			<Text style={styles.orText}>- OR -</Text>

			<TextInput
				style={styles.mnemonicInput}
				placeholder="Enter your 12 or 24 word mnemonic phrase"
				value={mnemonic}
				onChangeText={setMnemonic}
				editable={!isLoading}
				multiline
				numberOfLines={3}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<Button title="Import Wallet using Mnemonic" onPress={importWallet} disabled={isLoading} />
		</View>
	);
};

export default WalletSetupScreen; 