#!/usr/bin/env node

/**
 * Test Script for walletService.js
 * 
 * This script tests the walletService.js functions by fetching token balances
 * for a given wallet address on the Solana blockchain.
 * 
 * Run with: node test_wallet_service.js [wallet_address] [network]
 * 
 * Arguments:
 *   wallet_address - Solana wallet address to check (default: sample address)
 *   network - 'mainnet' or 'devnet' (default: mainnet)
 * 
 * Example:
 *   node test_wallet_service.js GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R mainnet
 */

// ES Module imports
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Define __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define colors for terminal output
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
const walletAddress = args[0] || 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R'; // Default wallet address
const network = args[1] || 'mainnet'; // Default network
const customRpcUrl = args[2] || null; // Optional custom RPC URL

// Banner
console.log(`${colors.cyan}${colors.bright}==============================================`);
console.log(`🔍 WALLET SERVICE TEST SCRIPT`);
console.log(`==============================================\n${colors.reset}`);

console.log(`${colors.yellow}Testing with:${colors.reset}`);
console.log(`- Wallet Address: ${colors.green}${walletAddress}${colors.reset}`);
console.log(`- Network: ${colors.green}${network}${colors.reset}`);
if (customRpcUrl) {
  console.log(`- Custom RPC URL: ${colors.green}${customRpcUrl}${colors.reset}`);
}
console.log('');

// Import the walletService module
async function importWalletService() {
  try {
    console.log(`${colors.cyan}Loading wallet service module...${colors.reset}`);
    
    // Try to import directly 
    try {
      const walletService = await import('../src/services/walletService.js');
      return walletService;
    } catch (importError) {
      console.error(`${colors.red}Error importing wallet service: ${importError.message}${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Failed to import wallet service: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Main function
async function run() {
  try {
    console.log(`${colors.cyan}Initializing wallet service test...${colors.reset}`);
    
    // Import the wallet service functions
    const walletService = await importWalletService();
    
    // Set custom RPC URL if provided
    if (customRpcUrl && walletService.setCustomRpcUrl) {
      console.log(`${colors.cyan}Setting custom RPC URL: ${customRpcUrl}${colors.reset}`);
      walletService.setCustomRpcUrl(customRpcUrl);
    }
    
    console.log(`${colors.cyan}Fetching SPL token balances...${colors.reset}`);
    console.time('Fetch time');
    
    // Get token balances
    const balances = await walletService.getSPLTokenBalances(walletAddress, network);
    
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
    console.error(`${colors.dim}${error.stack}${colors.reset}`);
    
    console.log(`\n${colors.red}${colors.bright}==============================================`);
    console.log(`❌ Test failed`);
    console.log(`==============================================\n${colors.reset}`);
  }
}

// Run the test
run(); 