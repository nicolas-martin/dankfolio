import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, Alert, ActivityIndicator, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
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
import { useWalletSetupLogic, WELCOME_TITLE, WELCOME_DESC, CREATE_WALLET_TITLE, CREATE_WALLET_DESC, IMPORT_WALLET_TITLE, IMPORT_WALLET_DESC, TERMS_TEXT, CREATING_WALLET_TITLE, CREATING_WALLET_DESC, WALLET_CREATED_TITLE, WALLET_CREATED_DESC } from './scripts';
import { logger } from '@/utils/logger';

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
		walletInfo
	} = useWalletSetupLogic(props);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: `Viewed WalletSetupScreen step: ${step}` });
	}, [step]);

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
			logger.exception(err, { functionName: 'generateWallet', context: 'WalletSetupScreen' });
			showToast({ message: err.message || 'Error generating wallet.', type: 'error' });
		}
	};

	const loadDebugWallet = async () => {
		try {
			logger.log('Attempting to load debug wallet...');
			if (!TEST_PRIVATE_KEY) {
				throw new Error('TEST_PRIVATE_KEY not found in environment');
			}

			logger.log('Decoded TEST_PRIVATE_KEY as Base64');
			const base58PrivateKey = base64ToBase58PrivateKey(TEST_PRIVATE_KEY);

			// Store the credentials
			await storeCredentials(base58PrivateKey, 'TEST_MNEMONIC'); // Empty mnemonic for debug wallet

			// Create keypair from Base58 private key
			const keypairBytes = Buffer.from(bs58.decode(base58PrivateKey));
			const keypair = Keypair.fromSecretKey(keypairBytes);

			logger.log('Created keypair from debug wallet');
			await setWallet(keypair.publicKey.toBase58());
			props.onWalletSetupComplete(keypair);
		} catch (error: any) {
			logger.error('Load Debug Wallet Error', { errorMessage: error.message });
			showToast({ message: `Error loading debug wallet: ${error.message}`, type: 'error' });
		}
	};

	const renderMnemonicWords = (mnemonic: string) => {
		const words = mnemonic.split(' ');
		return words.map((word, index) => (
			<View key={`word-${index}`} style={styles.mnemonicWord}>
				<Text style={styles.wordNumber}>{index + 1}.</Text>
				<Text style={styles.wordText}>{word}</Text>
			</View>
		));
	};

	return (
		<View style={styles.container}>
			{step === 'welcome' && (
				<>
					<View style={styles.section}>
						<Text style={styles.title}>{WELCOME_TITLE}</Text>
						<Text style={styles.subtitle}>{WELCOME_DESC}</Text>
					</View>
					<View style={styles.buttonRow}>
						<TouchableOpacity 
							onPress={() => {
								logger.breadcrumb({ category: 'ui', message: 'Create new wallet button pressed (welcome step)' });
								goToCreate();
							}} 
							style={[styles.actionButton, styles.actionButtonYellow]}
						>
							<Text style={styles.buttonText}>Create a new wallet</Text>
						</TouchableOpacity>
						<TouchableOpacity 
							onPress={() => {
								logger.breadcrumb({ category: 'ui', message: 'Import recovery phrase button pressed (welcome step)' });
								goToImport();
							}} 
							style={[styles.actionButton, styles.actionButtonLight]}
						>
							<Text style={styles.buttonText}>Import a recovery phrase</Text>
						</TouchableOpacity>
					</View>
					<Text style={styles.termsText}>{TERMS_TEXT}</Text>
					{IS_DEBUG_MODE && (
						<View style={styles.debugButtonContainer}>
							<Button
								title="Load Debug Wallet (TEST_PRIVATE_KEY)"
								onPress={() => {
									logger.breadcrumb({ category: 'ui', message: 'Debug wallet load pressed' });
									loadDebugWallet();
								}}
								color="lightgray"
							/>
						</View>
					)}
				</>
			)}
			{step === 'create' && (
				<View style={styles.section}>
					<View style={styles.iconPlaceholder} />
					<Text style={styles.title}>{CREATE_WALLET_TITLE}</Text>
					<Text style={styles.subtitle}>{CREATE_WALLET_DESC}</Text>
					<TouchableOpacity 
						onPress={handleCreateWallet} 
						style={[styles.actionButton, styles.actionButtonYellow, { marginTop: 32 }]}
					>
						<Text style={styles.buttonText}>Create a new wallet</Text>
					</TouchableOpacity>
				</View>
			)}
			{step === 'import' && (
				<View style={styles.section}>
					<View style={styles.iconPlaceholder} />
					<Text style={styles.title}>{IMPORT_WALLET_TITLE}</Text>
					<Text style={styles.subtitle}>{IMPORT_WALLET_DESC}</Text>
					<TextInput
						style={styles.recoveryInput}
						placeholder="Enter your 12-word phrase"
						value={recoveryPhrase}
						onChangeText={handleRecoveryPhraseChange}
						multiline
						numberOfLines={3}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					<TouchableOpacity
						onPress={handleImportWallet}
						style={[
							styles.actionButton, 
							styles.actionButtonYellow, 
							{ marginTop: 16, opacity: isRecoveryPhraseValid() ? 1 : 0.5 }
						]}
						disabled={!isRecoveryPhraseValid()}
					>
						<Text style={styles.buttonText}>Next</Text>
					</TouchableOpacity>
				</View>
			)}
			{step === 'creating' && (
				<View style={styles.loadingContainer}>
					{walletInfo.isLoading ? (
						<>
							<View style={styles.spinnerContainer}>
								<ActivityIndicator size="large" color="#F5C754" />
							</View>
							<Text style={styles.title}>{CREATING_WALLET_TITLE}</Text>
							<Text style={styles.subtitle}>{CREATING_WALLET_DESC}</Text>
						</>
					) : (
						<ScrollView showsVerticalScrollIndicator={false}>
							<View style={styles.centeredContent}>
								<View style={styles.iconPlaceholder} />
								<Text style={styles.title}>{WALLET_CREATED_TITLE}</Text>
								<Text style={styles.subtitle}>{WALLET_CREATED_DESC}</Text>
								
								<View style={styles.walletInfoCard}>
									<Text style={styles.walletInfoLabel}>Your wallet address</Text>
									<Text style={styles.walletInfoValue}>{walletInfo.publicKey}</Text>
									
									{walletInfo.mnemonic && (
										<View style={styles.mnemonicContainer}>
											<Text style={styles.walletInfoLabel}>Recovery phrase</Text>
											<View style={styles.mnemonicGrid}>
												{renderMnemonicWords(walletInfo.mnemonic)}
											</View>
										</View>
									)}
								</View>
							</View>
						</ScrollView>
					)}
				</View>
			)}
		</View>
	);
};

export default WalletSetup; 
