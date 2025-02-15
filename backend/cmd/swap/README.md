# WIF/SOL Swap Application

This application performs swaps between WIF and SOL tokens using the Raydium liquidity pools on Solana.

## Prerequisites

- Node.js v16 or higher
- A Solana wallet with SOL for transaction fees
- The wallet key file should be located at `../../keys/mainnet-wallet-1.json`

## Installation

1. Install dependencies:
```bash
npm install
```

## Configuration

The swap configuration can be modified in `main.js`:

- `tokenAAmount`: The amount of SOL to swap
- `slippage`: Maximum allowed slippage (default: 0.5%)
- `maxRetries`: Number of retry attempts for failed transactions

## Usage

Run the swap:
```bash
npm start
```

The application will:
1. Perform preflight checks (connection, balance)
2. Load the WIF/SOL pool information
3. Create and execute the swap transaction
4. Output the transaction URL and confirmation status

## Error Handling

- The application will retry failed transactions up to the configured `maxRetries`
- Each retry attempt includes a delay to avoid rate limiting
- Detailed error messages are logged to help diagnose issues 