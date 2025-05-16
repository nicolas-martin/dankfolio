import React, { useState } from 'react';
import { View, Text, Button, TextInput, Alert, ActivityIndicator } from 'react-native';
import { createStyles } from './styles';
import { handleGenerateWallet, handleImportWallet, storeCredentials, base64ToBase58PrivateKey } from './scripts';
import { WalletSetupScreenProps } from './types';
import { Keypair } from '@solana/web3.js';
import { useToast } from '@/components/Common/Toast';
import { DEBUG_MODE, TEST_PRIVATE_KEY } from '@env';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { useTheme } from 'react-native-paper';
import { usePortfolioStore } from '@store/portfolio';

const IS_DEBUG_MODE = DEBUG_MODE === 'true';

const WalletSetup = ({ onWalletSetupComplete }: WalletSetupScreenProps) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const [mnemonic, setMnemonic] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const { showToast } = useToast();
	const { setWallet } = usePortfolioStore();

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

	const loadDebugWallet = async () => {
		try {
			console.log('🔧 Attempting to load debug wallet...');
			if (!TEST_PRIVATE_KEY) {
				throw new Error('TEST_PRIVATE_KEY not found in environment');
			}

			console.log('✅ Decoded TEST_PRIVATE_KEY as Base64');
			const base58PrivateKey = base64ToBase58PrivateKey(TEST_PRIVATE_KEY);

			// Store the credentials
			await storeCredentials(base58PrivateKey, 'TEST_MNEMONIC'); // Empty mnemonic for debug wallet

			// Create keypair from Base58 private key
			const keypairBytes = Buffer.from(bs58.decode(base58PrivateKey));
			const keypair = Keypair.fromSecretKey(keypairBytes);

			console.log('✅ Created keypair from debug wallet');
			await setWallet(keypair.publicKey.toBase58());
			onWalletSetupComplete(keypair);
		} catch (error: any) {
			console.error('Load Debug Wallet Error:', error);
			showToast({ message: `Error loading debug wallet: ${error.message}`, type: 'error' });
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

			{IS_DEBUG_MODE && (
				<>
					<Text style={[styles.orText, { marginTop: 30 }]}>- OR (DEBUG) -</Text>
					<Button
						title="Load Debug Wallet (TEST_PRIVATE_KEY)"
						onPress={loadDebugWallet}
						disabled={isLoading}
						color="orange"
					/>
				</>
			)}
		</View>
	);
};

export default WalletSetup; 
