import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TokenSwap } from '@solana/spl-token-swap';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SecureStore } from '../utils/secureStore';

export class WalletService {
  private connection: Connection;
  private network: string;

  constructor() {
    this.network = process.env.SOLANA_NETWORK || 'devnet';
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );
  }

  async createWallet(): Promise<{ publicKey: string; secretKey: string }> {
    try {
      const wallet = await import('@solana/web3.js').then(sol => 
        sol.Keypair.generate()
      );
      
      const publicKey = wallet.publicKey.toString();
      const secretKey = Buffer.from(wallet.secretKey).toString('hex');

      // Store securely
      await SecureStore.setItem('walletSecretKey', secretKey);
      await SecureStore.setItem('walletPublicKey', publicKey);

      return { publicKey, secretKey };
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(
        new PublicKey(publicKey)
      );
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async sendTransaction(
    recipientAddress: string,
    amount: number,
    tokenMint?: string
  ): Promise<string> {
    try {
      const secretKey = await SecureStore.getItem('walletSecretKey');
      if (!secretKey) throw new Error('Wallet not found');

      const senderKeypair = await this.getKeypairFromSecretKey(secretKey);
      const recipient = new PublicKey(recipientAddress);

      let transaction: Transaction;
      if (tokenMint) {
        // Token transfer
        transaction = await this.createTokenTransferTransaction(
          senderKeypair.publicKey,
          recipient,
          new PublicKey(tokenMint),
          amount
        );
      } else {
        // SOL transfer
        transaction = await this.createSolTransferTransaction(
          senderKeypair.publicKey,
          recipient,
          amount
        );
      }

      const signature = await this.connection.sendTransaction(
        transaction,
        [senderKeypair]
      );

      return signature;
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  private async getKeypairFromSecretKey(secretKeyHex: string) {
    const secretKey = Buffer.from(secretKeyHex, 'hex');
    return await import('@solana/web3.js').then(sol => 
      sol.Keypair.fromSecretKey(secretKey)
    );
  }

  // Additional helper methods...
}

export const walletService = new WalletService(); 