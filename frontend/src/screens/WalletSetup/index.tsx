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
import {
	Container,
	Section,
	Title,
	Subtitle,
	ButtonRow,
	ActionButton,
	ButtonText,
	TermsText,
	RecoveryInput,
	IconPlaceholder,
} from './styles';
import { useWalletSetupLogic, WELCOME_TITLE, WELCOME_DESC, CREATE_WALLET_TITLE, CREATE_WALLET_DESC, IMPORT_WALLET_TITLE, IMPORT_WALLET_DESC, TERMS_TEXT } from './scripts';

const IS_DEBUG_MODE = DEBUG_MODE === 'true';

const WalletSetup: React.FC<WalletSetupScreenProps> = (props) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { showToast } = useToast();
	const { setWallet } = usePortfolioStore();
	const {
		step,
		goToCreate,
		goToImport,
		goToWelcome,
		handleCreateWallet,
		handleImportWallet,
		recoveryPhrase,
		handleRecoveryPhraseChange,
		isRecoveryPhraseValid,
	} = useWalletSetupLogic(props);

	const generateWallet = async () => {
		try {
			const keypair = await handleGenerateWallet();
			if (keypair) {
				showToast({ message: 'Wallet generated successfully!', type: 'success' });
				props.onWalletSetupComplete(keypair);
			} else {
				showToast({ message: 'Failed to generate wallet. Please try again.', type: 'error' });
			}
		} catch (err: any) {
			console.error("Generate Wallet Error:", err);
			showToast({ message: err.message || 'Error generating wallet.', type: 'error' });
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
			props.onWalletSetupComplete(keypair);
		} catch (error: any) {
			console.error('Load Debug Wallet Error:', error);
			showToast({ message: `Error loading debug wallet: ${error.message}`, type: 'error' });
		}
	};

	return (
		<Container>
			{step === 'welcome' && (
				<>
					<Section>
						<Title>{WELCOME_TITLE}</Title>
						<Subtitle>{WELCOME_DESC}</Subtitle>
					</Section>
					<ButtonRow>
						<ActionButton onPress={goToCreate} bg="#F5C754">
							<ButtonText>Create a new wallet</ButtonText>
						</ActionButton>
						<ActionButton onPress={goToImport} bg="#F2F0E8">
							<ButtonText>Import a recovery phrase</ButtonText>
						</ActionButton>
					</ButtonRow>
					<TermsText>{TERMS_TEXT}</TermsText>
					{IS_DEBUG_MODE && (
						<View style={{ marginTop: 'auto', paddingBottom: 20 }}>
							<Button
								title="Load Debug Wallet (TEST_PRIVATE_KEY)"
								onPress={loadDebugWallet}
								color="lightgray"
							/>
						</View>
					)}
				</>
			)}
			{step === 'create' && (
				<Section>
					<IconPlaceholder />
					<Title>{CREATE_WALLET_TITLE}</Title>
					<Subtitle>{CREATE_WALLET_DESC}</Subtitle>
					<ActionButton onPress={handleCreateWallet} bg="#F5C754" style={{ marginTop: 32 }}>
						<ButtonText>Create a new wallet</ButtonText>
					</ActionButton>
				</Section>
			)}
			{step === 'import' && (
				<Section>
					<IconPlaceholder />
					<Title>{IMPORT_WALLET_TITLE}</Title>
					<Subtitle>{IMPORT_WALLET_DESC}</Subtitle>
					<RecoveryInput
						placeholder="Enter your 12-word phrase"
						value={recoveryPhrase}
						onChangeText={handleRecoveryPhraseChange}
						multiline
						numberOfLines={3}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					<ActionButton
						onPress={handleImportWallet}
						bg="#F5C754"
						disabled={!isRecoveryPhraseValid()}
						style={{ marginTop: 16 }}
					>
						<ButtonText>Next</ButtonText>
					</ActionButton>
				</Section>
			)}
		</Container>
	);
};

export default WalletSetup; 
