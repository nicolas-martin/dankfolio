import React, { useEffect } from 'react';
import { View, Text, Button, TextInput, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme, IconButton } from 'react-native-paper';
import { createStyles } from './styles';
import { storeCredentials, base64ToBase58PrivateKey } from './scripts';
import { WalletSetupScreenProps } from './types';
import { Keypair } from '@solana/web3.js';
import { useToast } from '@/components/Common/Toast';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { usePortfolioStore } from '@store/portfolio';
import { useWalletSetupLogic, WELCOME_TITLE, WELCOME_DESC, CREATE_WALLET_TITLE, CREATE_WALLET_DESC, IMPORT_WALLET_DESC, TERMS_TEXT, CREATING_WALLET_TITLE, CREATING_WALLET_DESC, WALLET_CREATED_TITLE, WALLET_CREATED_DESC } from './scripts';
import { logger } from '@/utils/logger';
import { env } from '@utils/env';

const isDevelopmentOrSimulator = __DEV__ || env.appEnv === 'local' || env.appEnv === 'production-simulator';

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
		walletInfo,
		confirmWalletSaved,
		copyToClipboard
	} = useWalletSetupLogic(props);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: `Viewed WalletSetupScreen step: ${step}` });
	}, [step]);

	const loadDebugWallet = async () => {
		try {
			logger.log('Attempting to load debug wallet...');
			if (!env.testPrivateKey) {
				throw new Error('TEST_PRIVATE_KEY not found in environment');
			}

			logger.log('Decoded TEST_PRIVATE_KEY as Base64');
			const base58PrivateKey = base64ToBase58PrivateKey(env.testPrivateKey);

			// Store the credentials
			await storeCredentials(base58PrivateKey, 'TEST_MNEMONIC'); // Empty mnemonic for debug wallet

			// Create keypair from Base58 private key
			const keypairBytes = Buffer.from(bs58.decode(base58PrivateKey));
			const keypair = Keypair.fromSecretKey(keypairBytes);

			logger.log('Created keypair from debug wallet');
			await setWallet(keypair.publicKey.toBase58());
			props.onWalletSetupComplete(keypair);
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error('Load Debug Wallet Error', { errorMessage: error.message });
				showToast({ message: `Error loading debug wallet: ${error.message}`, type: 'error' });
			} else {
				logger.error('An unknown error occurred while loading debug wallet:', error);
				showToast({ message: `An unknown error occurred while loading debug wallet: ${error}`, type: 'error' });
			}
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
				<View style={styles.welcomeContainer}>
					<View style={styles.illustrationContainer}>
						<View style={styles.frameContainer}>
							<View style={styles.geometricShapes}>
								<View style={styles.shape1} />
								<View style={styles.shape2} />
								<View style={styles.shape3} />
							</View>
						</View>
						<View style={styles.plantContainer}>
							<View style={styles.plant} />
						</View>
						<View style={styles.vaseContainer}>
							<View style={styles.vase} />
						</View>
					</View>

					<View style={styles.welcomeContent}>
						<Text style={styles.title}>{WELCOME_TITLE}</Text>
						<Text style={styles.subtitle}>{WELCOME_DESC}</Text>

						<View style={styles.buttonContainer}>
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
					</View>

					{isDevelopmentOrSimulator && (
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
				</View>
			)}
			{step === 'create' && (
				<View style={styles.createContainer}>
					<View style={styles.headerContainer}>
						<TouchableOpacity
							onPress={() => {
								logger.breadcrumb({ category: 'ui', message: 'Back button pressed from create step' });
								goToWelcome();
							}}
							style={styles.backButton}
						>
							<Text style={styles.backButtonText}>←</Text>
						</TouchableOpacity>
						<Text style={styles.headerTitle}>Create a wallet</Text>
						<View style={styles.headerSpacer} />
					</View>

					<View style={styles.createContent}>
						<Text style={styles.title}>{CREATE_WALLET_TITLE}</Text>
						<Text style={styles.subtitle}>{CREATE_WALLET_DESC}</Text>

						<View style={styles.createButtonContainer}>
							<TouchableOpacity
								onPress={handleCreateWallet}
								style={[styles.actionButton, styles.actionButtonYellow]}
							>
								<Text style={styles.buttonText}>Create a new wallet</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}
			{step === 'import' && (
				<View style={styles.importContainer}>
					<View style={styles.headerContainer}>
						<TouchableOpacity
							onPress={() => {
								logger.breadcrumb({ category: 'ui', message: 'Back button pressed from import step' });
								goToWelcome();
							}}
							style={styles.backButton}
						>
							<Text style={styles.backButtonText}>←</Text>
						</TouchableOpacity>
						<Text style={styles.headerTitle}>Recovery phrase</Text>
						<View style={styles.headerSpacer} />
					</View>

					<View style={styles.importContent}>
						<Text style={styles.title}>{IMPORT_WALLET_DESC}</Text>

						<TextInput
							style={styles.importRecoveryInput}
							placeholder="Enter your 12-word phrase"
							value={recoveryPhrase}
							onChangeText={handleRecoveryPhraseChange}
							multiline
							numberOfLines={8}
							autoCapitalize="none"
							autoCorrect={false}
							textAlignVertical="top"
						/>

						<View style={styles.importButtonContainer}>
							<TouchableOpacity
								onPress={handleImportWallet}
								style={[
									styles.actionButton,
									styles.actionButtonYellow,
									{ opacity: isRecoveryPhraseValid() ? 1 : 0.5 }
								]}
								disabled={!isRecoveryPhraseValid()}
							>
								<Text style={styles.buttonText}>Next</Text>
							</TouchableOpacity>
						</View>
					</View>
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
									<View style={styles.walletInfoSection}>
										<View style={styles.walletInfoHeader}>
											<Text style={styles.walletInfoLabel}>Public Key</Text>
											<IconButton
												icon="content-copy"
												size={16}
												onPress={() => {
													logger.breadcrumb({ category: 'ui', message: 'Copied public key to clipboard from wallet creation' });
													copyToClipboard(walletInfo.publicKey, 'Public Key', showToast);
												}}
												style={styles.copyButton}
											/>
										</View>
										<Text style={styles.walletInfoValue}>{walletInfo.publicKey}</Text>
									</View>

									<View style={styles.walletInfoSection}>
										<View style={styles.walletInfoHeader}>
											<Text style={styles.walletInfoLabel}>Private Key</Text>
											<IconButton
												icon="content-copy"
												size={16}
												onPress={() => {
													logger.breadcrumb({ category: 'ui', message: 'Copied private key to clipboard from wallet creation' });
													copyToClipboard(walletInfo.privateKey, 'Private Key', showToast);
												}}
												style={styles.copyButton}
											/>
										</View>
										<Text style={styles.walletInfoValue}>{walletInfo.privateKey}</Text>
									</View>

									{walletInfo.mnemonic && (
										<View style={styles.walletInfoSection}>
											<View style={styles.walletInfoHeader}>
												<Text style={styles.walletInfoLabel}>Recovery Phrase</Text>
												<IconButton
													icon="content-copy"
													size={16}
													onPress={() => {
														logger.breadcrumb({ category: 'ui', message: 'Copied recovery phrase to clipboard from wallet creation' });
														copyToClipboard(walletInfo.mnemonic, 'Recovery Phrase', showToast);
													}}
													style={styles.copyButton}
												/>
											</View>
											<View style={styles.mnemonicGrid}>
												{renderMnemonicWords(walletInfo.mnemonic)}
											</View>
										</View>
									)}
								</View>

								<View style={styles.confirmButtonContainer}>
									<TouchableOpacity
										onPress={() => {
											logger.breadcrumb({ category: 'ui', message: 'I have saved my wallet information button pressed' });
											confirmWalletSaved();
										}}
										style={[styles.actionButton, styles.actionButtonYellow]}
									>
										<Text style={styles.buttonText}>I have saved my wallet information</Text>
									</TouchableOpacity>
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
