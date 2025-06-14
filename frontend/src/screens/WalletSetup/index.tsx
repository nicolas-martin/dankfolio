import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, ScrollView, TouchableOpacity, Image } from 'react-native';
import { WalletSetupScreenProps } from './types';
import { useToast } from '@/components/Common/Toast';
import { usePortfolioStore } from '@store/portfolio';
import { useWalletSetupLogic, CREATE_WALLET_TITLE, CREATE_WALLET_DESC, IMPORT_WALLET_DESC, CREATING_WALLET_TITLE, CREATING_WALLET_DESC, WALLET_CREATED_TITLE, WALLET_CREATED_DESC } from './scripts';
import { logger } from '@/utils/logger';
import CopyToClipboard from '@/components/Common/CopyToClipboard';
import { env } from '@utils/env';
import { initializeDebugWallet } from '@/utils/debugWallet';
import TermsModal from '@/components/Common/TermsModal';
// @ts-expect-error
import neonBarImage from '../../../assets/onboarding.jpg';
import { useStyles } from './styles';

const isDevelopmentOrSimulator = __DEV__ || env.appEnv === 'local' || env.appEnv === 'production-simulator';

const WalletSetup: React.FC<WalletSetupScreenProps> = (props) => {
	const styles = useStyles();
	const { showToast } = useToast();
	const { setWallet: _setWallet } = usePortfolioStore(); // Prefixed unused setWallet

	// Memoized styles
	const welcomeActionButtonStyle = useMemo(() =>
		[styles.actionButton, styles.actionButtonYellow].flat(),
		[styles.actionButton, styles.actionButtonYellow]
	);
	const [termsModalVisible, setTermsModalVisible] = useState(false);

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
		confirmWalletSaved
	} = useWalletSetupLogic(props);

	const importButtonStyle = useMemo(() => [
		styles.actionButton,
		styles.actionButtonYellow,
		{ opacity: isRecoveryPhraseValid() ? 1 : 0.5 }
	].flat(), [styles.actionButton, styles.actionButtonYellow, isRecoveryPhraseValid]);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: `Viewed WalletSetupScreen step: ${step}` });
	}, [step]);

	const loadDebugWallet = async () => {
		const keypair = await initializeDebugWallet();
		if (keypair) {
			props.onWalletSetupComplete(keypair);
		} else {
			showToast({ message: 'Failed to load debug wallet.', type: 'error' });
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

	const handleTermsPress = () => {
		logger.breadcrumb({ category: 'ui', message: 'Terms and conditions link pressed' });
		setTermsModalVisible(true);
	};

	const handleAcceptTerms = () => {
		logger.breadcrumb({ category: 'ui', message: 'Terms and conditions accepted' });
		showToast({
			message: "Terms & Conditions accepted",
			type: 'success'
		});
	};

	return (
		<View style={styles.container}>
			{step === 'welcome' && (
				<View style={styles.welcomeContainer}>
					<View style={styles.neonBarImageContainer}>
						<Image
							source={neonBarImage}
							style={styles.neonBarImage}
							resizeMode="cover"
						/>
					</View>

					<View style={styles.welcomeContent}>
						<Text style={styles.title}>Welcome to DankFolio</Text>
						<Text style={styles.subtitle}>Your gateway to the meme economy. Trade, hodl, and laugh your way to the moon with the dankest portfolio in crypto.</Text>

						<View style={styles.buttonContainer}>
							<TouchableOpacity
								onPress={() => {
									logger.breadcrumb({ category: 'ui', message: 'Create new wallet button pressed (welcome step)' });
									goToCreate();
								}}
								style={welcomeActionButtonStyle}
							>
								<Text style={styles.buttonText}>Create a new wallet</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									logger.breadcrumb({ category: 'ui', message: 'Import recovery phrase button pressed (welcome step)' });
									goToImport();
								}}
								style={welcomeActionButtonStyle}
							>
								<Text style={styles.buttonText}>Import a recovery phrase</Text>
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							onPress={handleTermsPress}
							style={styles.termsContainer}
						>
							<Text style={styles.termsText}>By proceeding, you agree to our Terms & Conditions</Text>
						</TouchableOpacity>
					</View>

					{isDevelopmentOrSimulator && (
						<Text
							style={styles.debugText}
							onPress={() => {
								loadDebugWallet();
							}}
						>
							Load Debug Wallet (TEST_PRIVATE_KEY)
						</Text>
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
								style={welcomeActionButtonStyle}
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
								style={importButtonStyle}
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
											<CopyToClipboard
												text={walletInfo.publicKey}
												onCopy={() => {
													logger.breadcrumb({ category: 'ui', message: 'Copied public key to clipboard from wallet creation' });
												}}
											/>
										</View>
										<Text style={styles.walletInfoValue}>{walletInfo.publicKey}</Text>
									</View>

									<View style={styles.walletInfoSection}>
										<View style={styles.walletInfoHeader}>
											<Text style={styles.walletInfoLabel}>Private Key</Text>
											<CopyToClipboard
												text={walletInfo.privateKey}
											/>
										</View>
										<Text style={styles.walletInfoValue}>{walletInfo.privateKey}</Text>
									</View>

									{walletInfo.mnemonic && (
										<View style={styles.walletInfoSection}>
											<View style={styles.walletInfoHeader}>
												<Text style={styles.walletInfoLabel}>Recovery Phrase</Text>
												<CopyToClipboard
													text={walletInfo.mnemonic}
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
										style={welcomeActionButtonStyle}
									>
										<Text style={styles.buttonText}>I have saved my wallet information</Text>
									</TouchableOpacity>
								</View>
							</View>
						</ScrollView>
					)}
				</View>
			)}

			{/* Terms and Conditions Modal */}
			<TermsModal
				isVisible={termsModalVisible}
				onAccept={handleAcceptTerms}
				onClose={() => setTermsModalVisible(false)}
			/>
		</View>
	);
};

export default WalletSetup; 
