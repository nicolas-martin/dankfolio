import { 
  Connection, 
  Keypair, 
  PublicKey, 
  VersionedTransaction 
} from '@solana/web3.js';
import { Liquidity, Token, TokenAmount, Percent } from '@raydium-io/raydium-sdk-v2';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';

// 1. Connection Configuration
const RPC_URL = 'https://solana-mainnet.rpcpool.com';
const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
});

// 2. Wallet Setup
const WALLET_PATH = '/Users/nma/dev/dankfolio/backend/keys/mainnet-wallet-1.json';
const walletKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'))
);

// 3. Swap Configuration
const SWAP_CONFIG = {
  tokenAAmount: 0.01,
  tokenAAddress: 'So11111111111111111111111111111111111111112', // SOL
  tokenBAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  direction: 'in' as 'in' | 'out',
  slippage: 0.5, // 0.5%
  maxRetries: 3,
  liquidityFile: 'trimmed_mainnet.json'
};

// 4. Load Pool Data
let poolKeys: any[];
try {
  poolKeys = JSON.parse(fs.readFileSync(SWAP_CONFIG.liquidityFile, 'utf-8'));
  if (!Array.isArray(poolKeys) throw new Error('Invalid pool data');
} catch (error) {
  console.error('Failed to load liquidity file:');
  console.error(error);
  process.exit(1);
}

async function createSwapTransaction() {
  const tokenA = new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey(SWAP_CONFIG.tokenAAddress),
    9,
    'SOL'
  );
  
  const tokenB = new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey(SWAP_CONFIG.tokenBAddress),
    6,
    'USDC'
  );

  const amountIn = new TokenAmount(
    tokenA,
    SWAP_CONFIG.tokenAAmount * 10 ** tokenA.decimals
  );

  const slippage = new Percent(SWAP_CONFIG.slippage * 100, 10_000);

  const { poolInfo, minAmountOut } = await Liquidity.getSwapInfo({
    connection,
    poolKeys: poolKeys.map(p => ({
      ...p,
      id: new PublicKey(p.id),
      baseMint: new PublicKey(p.baseMint),
      quoteMint: new PublicKey(p.quoteMint),
      lpMint: new PublicKey(p.lpMint),
    })),
    amountIn,
    currencyOut: tokenB,
    slippage,
    direction: SWAP_CONFIG.direction,
  });

  return Liquidity.makeSwapTransaction({
    connection,
    poolInfo,
    userKeys: {
      owner: walletKeypair.publicKey,
      payer: walletKeypair.publicKey,
    },
    amountIn,
    amountOut: minAmountOut,
    fixedSide: SWAP_CONFIG.direction,
  });
}

async function executeSwap() {
  for (let attempt = 1; attempt <= SWAP_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${SWAP_CONFIG.maxRetries}`);
      
      const { transaction } = await createSwapTransaction();
      const signedTx = await walletKeypair.signTransaction(transaction);
      
      const txid = await connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false }
      );
      
      console.log(`Transaction sent: https://solscan.io/tx/${txid}`);
      
      await connection.confirmTransaction(
        txid,
        'confirmed'
      );
      
      console.log('Swap confirmed successfully');
      return;
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`);
      console.error(error);
      
      if (attempt === SWAP_CONFIG.maxRetries) {
        throw new Error('All swap attempts failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function preflightChecks() {
  try {
    const version = await connection.getVersion();
    console.log(`Connected to Solana ${version['solana-core']}`);
    
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`Wallet balance: ${balance / 1e9} SOL`);
    
    if (balance < 0.01 * 1e9) {
      throw new Error('Insufficient SOL balance for swap');
    }
  } catch (error) {
    console.error('Preflight check failed:');
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  await preflightChecks();
  await executeSwap();
}

main().catch(error => {
  console.error('Fatal error:');
  console.error(error);
  process.exit(1);
});