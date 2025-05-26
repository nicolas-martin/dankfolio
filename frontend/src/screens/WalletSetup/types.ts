import { Keypair } from '@solana/web3.js';

export interface WalletSetupScreenProps {
	onWalletSetupComplete: (wallet: Keypair) => void;
	onCreateWallet: () => void;
	onImportWallet: () => void;
}

export type WalletSetupStep = 'welcome' | 'create' | 'import' | 'creating';

export interface WalletSetupState {
	step: WalletSetupStep;
	recoveryPhrase: string;
}

export interface WalletInfo {
	publicKey: string;
	privateKey: string;
	mnemonic: string;
	isLoading: boolean;
} 