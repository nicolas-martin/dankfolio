#!/usr/bin/env node

/**
 * Test Script for Solana Wallet Token Balances
 * 
 * This script helps debug issues with the walletService.js implementation
 * by fetching token balances for a Solana wallet address on mainnet.
 * 
 * Usage:
 *   node test_wallet_balances.js [wallet_address] [custom_rpc_url] [flags]
 * 
 * Arguments:
 *   wallet_address - Solana wallet address to check (default: GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R)
 *   custom_rpc_url - Optional custom RPC endpoint
 * 
 * Flags:
 *   --verbose, -v  Show detailed debug output 
 *   --help, -h     Show this help message
 * 
 * Examples:
 *   node test_wallet_balances.js GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R
 *   node test_wallet_balances.js GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R --verbose
 *   node test_wallet_balances.js GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R https://rpc.ankr.com/solana
 */

// Import required dependencies
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Define __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Terminal colors for better output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Parse command line arguments
const args = process.argv.slice(2);
// Extract flags
const flags = args.filter(arg => arg.startsWith('-'));
// Extract positional arguments (non-flags)
const positionalArgs = args.filter(arg => !arg.startsWith('-'));

const walletAddress = positionalArgs[0] || 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R'; // Default wallet address
const customRpcUrl = positionalArgs[1] || null; // Optional custom RPC URL
const verbose = flags.includes('--verbose') || flags.includes('-v'); // Verbose mode
const showHelp = flags.includes('--help') || flags.includes('-h'); // Show help

// Display help if requested
if (showHelp) {
  const helpText = `
${colors.bright}Solana Wallet Token Balance Test${colors.reset}

This script helps debug issues with wallet service implementations
by fetching token balances for Solana wallet addresses.

${colors.bright}Usage:${colors.reset}
  node test_wallet_balances.js [wallet_address] [custom_rpc_url] [flags]

${colors.bright}Arguments:${colors.reset}
  wallet_address     Solana wallet address to check 
                     (default: GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R)
  custom_rpc_url     Optional custom RPC endpoint

${colors.bright}Flags:${colors.reset}
  --verbose, -v      Show detailed debug output
  --help, -h         Show this help message

${colors.bright}Examples:${colors.reset}
  node test_wallet_balances.js GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R
  node test_wallet_balances.js GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R --verbose
  node test_wallet_balances.js GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R https://rpc.ankr.com/solana
  `;
  
  console.log(helpText);
  process.exit(0);
}

// Set up mainnet RPC endpoints
const RPC_ENDPOINTS = [
  clusterApiUrl('mainnet-beta'),
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana', 
  'https://ssc-dao.genesysgo.net',
  'https://solana-mainnet.g.alchemy.com/v2/demo', // Alchemy demo key
  'https://solana-mainnet.public.blastapi.io', // Blast API public endpoint
];

// Known tokens mapping for quick metadata access - same as in walletService.js
const KNOWN_TOKENS = {
  'So11111111111111111111111111111111111111112': { 
    symbol: 'SOL', 
    name: 'Solana',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    decimals: 9
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { 
    symbol: 'USDC', 
    name: 'USD Coin',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    decimals: 6
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { 
    symbol: 'USDT', 
    name: 'Tether USD',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
    decimals: 6
  },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { 
    symbol: 'mSOL', 
    name: 'Marinade Staked SOL',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
    decimals: 9
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { 
    symbol: 'BONK', 
    name: 'Bonk',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.svg',
    decimals: 5
  },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': {
    symbol: 'EKpQ',
    name: 'Pudgy Penguin',
    logo: null,
    decimals: 6
  },
  '28B63oRCS2K83EUqTRbe7qYEvQFFTPbntiUnJNKLpump': {
    symbol: '28B6',
    name: 'KinoSwap',
    logo: null,
    decimals: 6
  }
};

// Cache for token metadata
const tokenMetadataCache = new Map();

// Utility function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Try to import wallet service for reuse
async function importWalletService() {
  try {
    // Try to dynamically import the wallet service
    const walletService = await import('../src/services/walletService.js');
    console.log(`${colors.green}Successfully imported walletService.js${colors.reset}`);
    return walletService;
  } catch (error) {
    console.log(`${colors.yellow}Could not import walletService.js, using built-in implementation${colors.reset}`);
    return null;
  }
}

// Banner
console.log(`${colors.cyan}${colors.bright}==============================================`);
console.log(`🔍 SOLANA WALLET TOKEN BALANCE TEST`);
console.log(`==============================================\n${colors.reset}`);

console.log(`${colors.yellow}Testing with:${colors.reset}`);
console.log(`- Wallet Address: ${colors.green}${walletAddress}${colors.reset}`);
if (customRpcUrl) {
  console.log(`- Custom RPC URL: ${colors.green}${customRpcUrl}${colors.reset}`);
}
console.log('');

/**
 * Get a connection to the Solana blockchain
 */
async function getConnection() {
  if (customRpcUrl) {
    console.log(`${colors.cyan}Using custom RPC endpoint: ${customRpcUrl}${colors.reset}`);
    return new Connection(customRpcUrl, 'confirmed');
  }
  
  // Try each endpoint until one works
  for (const endpoint of RPC_ENDPOINTS) {
    const connection = new Connection(endpoint, 'confirmed');
    try {
      console.log(`${colors.cyan}Testing RPC endpoint: ${endpoint}${colors.reset}`);
      // Test the connection with a simple request
      await connection.getRecentBlockhash();
      console.log(`${colors.green}Using RPC endpoint: ${endpoint}${colors.reset}`);
      return connection;
    } catch (error) {
      console.warn(`${colors.yellow}RPC endpoint ${endpoint} failed: ${error.message}${colors.reset}`);
      // Continue to the next endpoint
    }
  }
  
  // If all endpoints fail, use the first one as fallback
  console.warn(`${colors.yellow}All RPC endpoints failed, using first one as fallback${colors.reset}`);
  return new Connection(RPC_ENDPOINTS[0], 'confirmed');
}

/**
 * Execute with retry for rate limiting
 */
async function executeWithRetry(rpcCall, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Exponential backoff delay, skipped on first attempt
      if (attempt > 0) {
        const delay = Math.min(100 * Math.pow(2, attempt), 3000);
        console.log(`${colors.yellow}Retry attempt ${attempt}, waiting ${delay}ms${colors.reset}`);
        await sleep(delay);
      }
      
      return await rpcCall();
    } catch (error) {
      lastError = error;
      
      // If it's a 403 or 429 (rate limit) error, retry with backoff
      if (error.message && (error.message.includes('403') || error.message.includes('429'))) {
        console.warn(`${colors.yellow}Rate limit hit (${error.message}), will retry${colors.reset}`);
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
  
  // If we've exhausted retries, throw the last error
  throw lastError;
}

/**
 * Fetch SPL token balances for a wallet
 */
async function getSPLTokenBalances() {
  try {
    console.log(`${colors.cyan}Fetching token balances for wallet: ${walletAddress}${colors.reset}`);
    
    // Get connection
    const connection = await getConnection();
    
    // Convert address string to PublicKey
    const publicKey = new PublicKey(walletAddress);
    
    console.log(`${colors.cyan}Fetching SOL balance...${colors.reset}`);
    // First get native SOL balance with retry
    const solBalance = await executeWithRetry(() => 
      connection.getBalance(publicKey)
    );
    console.log(`${colors.green}SOL balance: ${solBalance / 1e9} SOL${colors.reset}`);
    
    // Initialize balances array
    let tokenBalancesData = [];
    
    // Add SOL if balance exists
    if (solBalance > 0) {
      const solMint = 'So11111111111111111111111111111111111111112';
      tokenBalancesData.push({
        mint: solMint,
        amount: solBalance.toString(),
        decimals: 9,
        uiAmount: solBalance / 1e9,
        symbol: KNOWN_TOKENS[solMint]?.symbol || 'SOL',
        name: KNOWN_TOKENS[solMint]?.name || 'Solana',
        logo: KNOWN_TOKENS[solMint]?.logo || null
      });
    }
    
    try {
      console.log(`${colors.cyan}Fetching SPL token accounts...${colors.reset}`);
      // Use getParsedTokenAccountsByOwner with retry
      const tokenAccounts = await executeWithRetry(() => 
        connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID },
          'confirmed'
        )
      );
      
      console.log(`${colors.green}Found ${tokenAccounts.value.length} token accounts${colors.reset}`);
      
      // Filter accounts with balances > 0 and extract basic data
      let nonZeroTokens = 0;
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed.info;
        const mintAddress = accountData.mint;
        const tokenAmount = accountData.tokenAmount;
        
        // Only include tokens with non-zero balance
        if (parseInt(tokenAmount.amount) > 0) {
          nonZeroTokens++;
          // Check if it's a known token
          const knownToken = KNOWN_TOKENS[mintAddress];
          
          tokenBalancesData.push({
            mint: mintAddress,
            amount: tokenAmount.amount,
            decimals: tokenAmount.decimals,
            uiAmount: tokenAmount.uiAmount,
            symbol: knownToken?.symbol || mintAddress.slice(0, 4),
            name: knownToken?.name || `Token (${mintAddress.slice(0, 8)}...)`,
            logo: knownToken?.logo || null
          });
        }
      }
      console.log(`${colors.green}Found ${nonZeroTokens} tokens with non-zero balance${colors.reset}`);
      
      return tokenBalancesData;
    } catch (tokenError) {
      console.error(`${colors.red}Error fetching SPL tokens: ${tokenError.message}${colors.reset}`);
      if (verbose) {
        console.error(`${colors.dim}${tokenError.stack}${colors.reset}`);
      }
      
      // Log detailed error for debugging
      if (tokenError.message) {
        if (tokenError.message.includes('403')) {
          console.warn(`${colors.yellow}⚠️ Rate limiting detected (403 error), try using a dedicated RPC provider${colors.reset}`);
        } else if (tokenError.message.includes('429')) {
          console.warn(`${colors.yellow}⚠️ Too many requests (429 error), try again later${colors.reset}`);
        } else if (tokenError.message.includes('timeout')) {
          console.warn(`${colors.yellow}⚠️ RPC request timed out, network might be congested${colors.reset}`);
        }
      }
      
      // If we have SOL balance, return just that
      if (tokenBalancesData.length > 0) {
        return tokenBalancesData;
      }
      
      return [];
    }
  } catch (error) {
    console.error(`${colors.red}Error in getSPLTokenBalances: ${error.message}${colors.reset}`);
    if (verbose) {
      console.error(`${colors.dim}${error.stack}${colors.reset}`);
    }
    return [];
  }
}

// Main function
async function run() {
  try {
    console.log(`${colors.cyan}Starting token balance test...${colors.reset}`);
    console.time('Fetch time');
    
    // Try to use the imported wallet service first
    const walletService = await importWalletService();
    let balances;
    
    if (walletService) {
      // Get token balances using the actual walletService.js
      console.log(`${colors.cyan}Fetching token balances using walletService.js...${colors.reset}`);
      balances = await walletService.getSPLTokenBalances(walletAddress, null, customRpcUrl);
    } else {
      // Get token balances using our implementation
      console.log(`${colors.cyan}Fetching token balances using Solana RPC...${colors.reset}`);
      balances = await getSPLTokenBalances();
    }
    
    console.timeEnd('Fetch time');
    
    // Display results
    console.log(`\n${colors.green}${colors.bright}Found ${balances.length} tokens:${colors.reset}\n`);
    
    if (balances.length === 0) {
      console.log(`${colors.yellow}No token balances found for this wallet.${colors.reset}`);
    } else {
      // Display token balances in a table
      console.log(`${colors.bright}Symbol  | Name                  | Amount              | Decimals | Mint Address${colors.reset}`);
      console.log('-------+----------------------+--------------------+----------+-----------------------------------');
      
      balances.forEach(token => {
        const symbol = token.symbol || 'Unknown';
        const name = token.name || 'Unknown';
        const amount = token.uiAmount?.toString() || '0';
        
        console.log(
          `${symbol.padEnd(7)} | ${name.slice(0, 20).padEnd(20)} | ${amount.padEnd(18)} | ${token.decimals.toString().padEnd(8)} | ${token.mint}`
        );
      });
    }
    
    console.log(`\n${colors.cyan}${colors.bright}==============================================`);
    console.log(`✅ Test completed successfully`);
    console.log(`==============================================\n${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}ERROR: ${error.message}${colors.reset}`);
    if (verbose) {
      console.error(`${colors.dim}${error.stack}${colors.reset}`);
    }
    
    console.log(`\n${colors.red}${colors.bright}==============================================`);
    console.log(`❌ Test failed`);
    console.log(`==============================================\n${colors.reset}`);
  }
}

// Run the test
run(); 