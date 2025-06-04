#!/usr/bin/env node

/**
 * This script loads environment variables from .env.local and sets them
 * in the process environment before building for simulator-release.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to .env.local file
const envLocalPath = path.resolve(process.cwd(), '.env.local');

// Check if .env.local exists
if (!fs.existsSync(envLocalPath)) {
  console.error('❌ Error: .env.local file not found!');
  console.error('Please create a .env.local file with your environment variables.');
  console.error('Make sure to include REACT_APP_SOLANA_RPC_ENDPOINT and other required variables.');
  process.exit(1);
}

// Load .env.local
const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));

// Log loaded variables (without values for security)
console.log('🔧 Loaded environment variables from .env.local:');
Object.keys(envConfig).forEach(key => {
  // Don't show actual values in logs for security
  console.log(`  - ${key}: ${key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') ? '[HIDDEN]' : envConfig[key]}`);
  
  // Set in process.env for the current process
  process.env[key] = envConfig[key];
});

console.log('✅ Environment variables loaded successfully!');
console.log('🚀 Continuing with simulator-release build...'); 