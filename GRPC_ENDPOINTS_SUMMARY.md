# gRPC Endpoints Summary

This document provides a comprehensive overview of all gRPC endpoints defined in the Dankfolio project, their implementation status, and mock data availability.

## Service Overview

### 1. CoinService (`/proto/dankfolio/v1/coin.proto`)

| Endpoint | Description | Mock Implementation | Status |
|----------|-------------|-------------------|---------|
| `GetAvailableCoins` | Returns paginated list of available coins | ✅ Implemented | Active |
| `GetCoinByID` | Returns a specific coin by address | ✅ Implemented | Active |
| `GetCoinsByIDs` | Returns multiple coins by their IDs in batch | ✅ Implemented | Active |
| `SearchCoinByAddress` | Searches for a coin by mint address | ✅ Implemented | Active |
| `GetAllCoins` | Returns all available coins | ✅ Implemented | Not Used |
| `Search` | Searches coins by various criteria | ✅ Implemented | Active |
| `GetNewCoins` | Returns newly listed coins | ✅ Implemented | Active |
| `GetTrendingCoins` | Returns trending coins | ✅ Implemented | Active |
| `GetTopGainersCoins` | Returns top gainer coins | ✅ Implemented | Active |

### 2. UtilityService (`/proto/dankfolio/v1/utility.proto`)

| Endpoint | Description | Mock Implementation | Status |
|----------|-------------|-------------------|---------|
| `GetProxiedImage` | Fetches images via backend proxy | ✅ Implemented | Active |

### 3. WalletService (`/proto/dankfolio/v1/wallet.proto`)

| Endpoint | Description | Mock Implementation | Status |
|----------|-------------|-------------------|---------|
| `GetWalletBalances` | Returns coin balances for a wallet | ✅ Implemented | Active |
| `CreateWallet` | Generates a new Solana wallet | ✅ Implemented | Active |
| `PrepareTransfer` | Prepares unsigned transfer transaction | ✅ Implemented | Active |
| `SubmitTransfer` | Submits signed transfer transaction | ✅ Implemented | Active |

### 4. TradeService (`/proto/dankfolio/v1/trade.proto`)

| Endpoint | Description | Mock Implementation | Status |
|----------|-------------|-------------------|---------|
| `GetSwapQuote` | Returns quote for potential trade | ✅ Implemented | Active |
| `PrepareSwap` | Prepares unsigned swap transaction | ✅ Implemented | Active |
| `SubmitSwap` | Submits trade for execution | ✅ Implemented | Active |
| `GetTrade` | Returns trade details and status | ✅ Implemented | Active |
| `ListTrades` | Returns list of trades | ✅ Implemented | Active |

### 5. PriceService (`/proto/dankfolio/v1/price.proto`)

| Endpoint | Description | Mock Implementation | Status |
|----------|-------------|-------------------|---------|
| `GetPriceHistory` | Returns historical price data | ✅ Implemented | Active |
| `GetCoinPrices` | Returns current prices for multiple coins | ✅ Implemented | Active |

## Recent Changes

### June 2025
- Added `GetCoinsByIDs` endpoint for efficient bulk coin fetching
- Implemented mock handlers for all missing endpoints
- Enhanced mock data with realistic test scenarios

## Mock Data Categories

1. **Trending Coins** - High price change percentages
2. **New Coins** - Recently listed, sorted by Jupiter listing date
3. **Top Gainers** - Highest 24h price change
4. **Base Coins** - SOL, USDC, JUP, BONK with realistic data

## Testing

Mock implementations are located in:
- `/frontend/e2e/mockApi/mockFetch.ts` - Mock fetch handlers
- `/frontend/e2e/mockApi/mockData.ts` - Mock data definitions

All endpoints are fully mocked for E2E testing with realistic responses that match the protobuf schemas.