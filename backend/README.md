# DankFolio API

## Overview
DankFolio is the ultimate platform for trading and managing your meme coin portfolio. Our API provides comprehensive endpoints for trading meme coins, managing portfolios, and competing on the leaderboard.

## Prerequisites
- Go 1.22 or higher
- PostgreSQL 13 or higher
- Redis 6 or higher

### Installation
1. Clone the repository
2. Install dependencies: `go mod download`
3. Copy `.env.example` to `.env` and configure environment variables
4. Run migrations: `make migrate-up`
5. Start the server: `make run`

## Wallet and Key Management

- Wallet keypairs are stored in the `keys/` directory. For mainnet, generate a new wallet using:
  ```bash
  mkdir -p keys && solana-keygen new --outfile keys/mainnet-wallet.json
  ```
- Ensure you secure your seed phrase and fund your wallet with sufficient SOL for transaction fees.
- The token swap tool (using Raydium mainnet pools for WIF token swaps) is located at `backend/cmd/test-buy-token/main.go`. Run it with:
  ```bash
  cd backend && go run cmd/test-buy-token/main.go
  ``` 