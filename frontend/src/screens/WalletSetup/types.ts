import { Keypair } from '@solana/web3.js';

export interface WalletSetupScreenProps {
	onWalletSetupComplete: (wallet: Keypair) => void;
} 