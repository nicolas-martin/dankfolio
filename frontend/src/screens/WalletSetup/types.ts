import { Keypair } from '@solana/web3.js';

export interface WalletSetupScreenProps {
	onWalletSetupComplete: (wallet: Keypair) => void;
	onCreateWallet: () => void;
	onImportWallet: () => void;
}

export type WalletSetupStep = 'welcome' | 'create' | 'import';

export interface WalletSetupState {
	step: WalletSetupStep;
	recoveryPhrase: string;
} 