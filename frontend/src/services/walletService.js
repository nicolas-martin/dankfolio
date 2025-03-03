import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Mainnet RPC endpoints - multiple options for fallback
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana', 
  clusterApiUrl('mainnet-beta'),
];


// Known tokens mapping for quick metadata access
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
  // Add more known tokens as needed
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

// Custom RPC URL if provided (can be set at runtime)
let customRpcUrl = null;

/**
 * Set a custom RPC URL to use instead of the defaults
 * @param {string} url - Custom RPC URL
 */
export const setCustomRpcUrl = (url) => {
  if (url && url.trim() && url !== 'mainnet') {
    // Only set if it's a valid URL format
    if (url.startsWith('http://') || url.startsWith('https://')) {
      customRpcUrl = url.trim();
      console.log(`Custom RPC URL set: ${customRpcUrl}`);
    } else {
      console.log(`Invalid RPC URL format ignored: ${url}`);
    }
  } else {
    customRpcUrl = null;
  }
};

// Utility function to sleep for retry mechanism
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get a connection to the Solana blockchain with fallback support
 * @param {string} customUrl - Optional custom RPC URL
 * @returns {Promise<Connection>} - Solana connection object
 */
export async function getConnection(customUrl = null) {
  // Use provided URL or the globally set one
  const effectiveUrl = customUrl || customRpcUrl;
  
  // If custom URL is set and valid, use it exclusively
  if (effectiveUrl && (effectiveUrl.startsWith('http://') || effectiveUrl.startsWith('https://'))) {
    console.log(`Using custom RPC endpoint: ${effectiveUrl}`);
    return new Connection(effectiveUrl, 'confirmed');
  }
  
  // Try each endpoint until one works
  for (const endpoint of RPC_ENDPOINTS) {
    const connection = new Connection(endpoint, 'confirmed');
    try {
      console.log(`Testing RPC endpoint: ${endpoint}`);
      // Test the connection with a simple request
      await connection.getRecentBlockhash();
      console.log(`Using RPC endpoint: ${endpoint}`);
      return connection;
    } catch (error) {
      console.warn(`RPC endpoint ${endpoint} failed: ${error.message}`);
      // Continue to the next endpoint
    }
  }
  
  // If all endpoints fail, use the first one as fallback
  console.warn(`All RPC endpoints failed, using first one as fallback`);
  return new Connection(RPC_ENDPOINTS[0], 'confirmed');
}

/**
 * Execute with retry for rate limiting
 * @param {Function} rpcCall - Function that makes the RPC call
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>} - Result of the RPC call
 */
async function executeWithRetry(rpcCall, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Exponential backoff delay, skipped on first attempt
      if (attempt > 0) {
        const delay = Math.min(100 * Math.pow(2, attempt), 3000);
        console.log(`Retry attempt ${attempt}, waiting ${delay}ms`);
        await sleep(delay);
      }
      
      return await rpcCall();
    } catch (error) {
      lastError = error;
      
      // If it's a 403 or 429 (rate limit) error, retry with backoff
      if (error.message && (error.message.includes('403') || error.message.includes('429'))) {
        console.warn(`Rate limit hit (${error.message}), will retry`);
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
 * Get SPL token balances for a wallet
 * @param {string} walletAddress - Solana wallet address
 * @param {string} network - For backwards compatibility, can be ignored
 * @param {string} customUrl - Optional custom RPC URL
 * @returns {Promise<Array>} - Array of token balances
 */
export async function getSPLTokenBalances(walletAddress, network = null, customUrl = null) {
  try {
    // For backwards compatibility - if network is a URL, use it as customUrl
    if (network && (network.startsWith('http://') || network.startsWith('https://'))) {
      customUrl = network;
      network = null;
    }
    
    console.log(`Fetching token balances for wallet: ${walletAddress}`);
    
    // Get connection with fallbacks
    const connection = await getConnection(customUrl);
    
    // Convert address string to PublicKey
    const publicKey = new PublicKey(walletAddress);
    
    console.log('Fetching SOL balance...');
    // First get native SOL balance with retry
    const solBalance = await executeWithRetry(() => 
      connection.getBalance(publicKey)
    );
    console.log(`SOL balance: ${solBalance / 1e9} SOL`);
    
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
        symbol: 'SOL',
        name: 'Solana',
        logo: KNOWN_TOKENS[solMint]?.logo || null
      });
    }
    
    try {
      console.log('Fetching SPL token accounts...');
      // Use getParsedTokenAccountsByOwner with retry
      const tokenAccounts = await executeWithRetry(() => 
        connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID },
          'confirmed'
        )
      );
      
      console.log(`Found ${tokenAccounts.value.length} token accounts`);
      
      // Filter accounts with balances > 0 and extract basic data
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed.info;
        const mintAddress = accountData.mint;
        const tokenAmount = accountData.tokenAmount;
        
        // Only include tokens with non-zero balance
        if (parseInt(tokenAmount.amount) > 0) {
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
      
      return tokenBalancesData;
    } catch (tokenError) {
      console.error(`Error fetching SPL tokens: ${tokenError.message}`);
      
      // Log detailed error for debugging
      if (tokenError.message) {
        if (tokenError.message.includes('403')) {
          console.warn('⚠️ Rate limiting detected (403 error), try using a dedicated RPC provider');
        } else if (tokenError.message.includes('429')) {
          console.warn('⚠️ Too many requests (429 error), try again later');
        } else if (tokenError.message.includes('timeout')) {
          console.warn('⚠️ RPC request timed out, network might be congested');
        }
      }
      
      // If we have SOL balance, return just that
      if (tokenBalancesData.length > 0) {
        return tokenBalancesData;
      }
      
      return [];
    }
  } catch (error) {
    console.error(`Error in getSPLTokenBalances: ${error.message}`);
    return [];
  }
}

/**
 * Get a connection to use for the app (simplified for direct use)
 * @returns {Connection} Solana connection object
 */
export function getSimpleConnection() {
  // Use mainnet-beta as primary endpoint
  return new Connection(RPC_ENDPOINTS[0], 'confirmed');
} 