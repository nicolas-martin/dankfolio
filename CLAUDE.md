# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dankfolio is a Solana-based meme coin trading application with a React Native frontend and Go backend. The system uses gRPC for communication and features real-time trading, portfolio tracking, and coin discovery.

## Key Features

### Trading & Portfolio
- **DEX Trading**: Swap tokens directly through Jupiter aggregator
- **Portfolio Tracking**: Real-time portfolio value with PnL calculations
- **Transaction History**: Complete trade history with status tracking
- **Fee Optimization**: Smart fee mint selection for optimal trading costs
- **Price Charts**: Interactive charts with multiple timeframes (1H, 24H, 7D, 30D)

### Coin Discovery
- **Trending Coins**: Discover trending meme coins on Solana
- **Search**: Find coins by name, symbol, or mint address
- **Coin Details**: Market cap, volume, holders, price history
- **Graduation Tracking**: Monitor pump.fun bonding curve graduations
- **Logo Caching**: Efficient image proxy with S3 storage

### Wallet Features
- **Wallet Creation**: Secure wallet generation with keychain storage
- **Balance Checking**: Real-time SOL and token balances
- **Send Functionality**: Transfer tokens to other wallets
- **Multi-wallet Support**: Manage multiple Solana wallets

### User Experience
- **Dark/Light Theme**: Customizable appearance
- **Pull-to-Refresh**: Update data with gesture
- **Odometer Animations**: Smooth number transitions
- **Error Handling**: User-friendly error messages
- **Content Filtering**: Multi-language banned words protection

### Monitoring & Analytics
- **Grafana Dashboards**: Real-time system metrics
- **OpenTelemetry**: Distributed tracing
- **Health Checks**: Service availability monitoring
- **Cache Performance**: Redis/in-memory metrics

## Common Development Commands

### Build & Run
- `make run` - Start backend server (terminates existing instance first)
- `make mobile` - Start mobile frontend (stops existing + runs linters)
- `make test` - Run all backend and frontend tests
- `make clean-build` - Clean rebuild (removes node_modules, Pods, etc.)

### Backend (run from `./backend/`)
- `make backend-test` - Run Go tests with mock generation
- `make backend-build` - Compile Go code
- `make mocks` - Generate interface mocks using mockery v3.3.2
- `make proto` - Generate protobuf files
- `go run cmd/banned-words-manager/main.go` - Manage banned words from multiple languages

### Frontend (run from `./frontend/`)
- `yarn test` - Run Jest tests (logic only, excludes UI tests)
- `yarn test:coverage` - Run tests with coverage report
- `yarn lint` - Run ESLint with auto-fix
- `yarn start:ios` - Run on iOS device/simulator
- `yarn test:e2e` - Run Maestro E2E tests

### Database
- `make psql` - Connect to PostgreSQL using .env DB_URL

### Grafana Dashboard Deployment
- `scp ./deploy/dashboards/* linode:/var/lib/grafana/dashboards/` - Copy dashboard files to server
- `ssh linode 'systemctl restart grafana-server.service'` - Restart Grafana service
- `make dash` - SCP dashboard and restart Grafana on prod server
- Dashboard URL: `https://corsairsoftware.io/grafana/d/{dashboard-id}/{dashboard-name}`
- Basic Auth: Get credentials from `/etc/grafana/grafana.ini` on server
- Use Puppeteer to validate dashboard with basic auth credentials
- Validate dashboard output using Puppeteer after uploading

## Project Structure

### Directory Layout
```
dankfolio/
├── backend/
│   ├── cmd/
│   │   ├── api/                     # Main API server
│   │   ├── banned-words-manager/    # Multi-language content filtering
│   │   ├── check-balances/          # Balance verification utility
│   │   └── test-image-upload/       # Image upload testing
│   ├── internal/
│   │   ├── api/grpc/                # gRPC service implementations
│   │   ├── cache/                   # Caching layer (Redis/in-memory)
│   │   ├── clients/                 # External API clients
│   │   ├── db/                      # Database repositories
│   │   ├── logger/                  # Structured logging
│   │   ├── middleware/              # HTTP/gRPC middleware
│   │   ├── model/                   # Domain models
│   │   ├── service/                 # Business logic services
│   │   │   ├── coin/               # Coin discovery & management
│   │   │   ├── image/              # Image fetching & processing
│   │   │   ├── imageproxy/         # Image proxy service
│   │   │   ├── price/              # Price data & history
│   │   │   └── trade/              # Trading operations
│   │   ├── telemetry/              # OpenTelemetry integration
│   │   └── util/                   # Utility functions
│   └── proto/                       # Protocol buffer definitions
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Chart/             # Price charts
│   │   │   ├── CoinDetails/       # Coin info displays
│   │   │   ├── Common/            # Shared components
│   │   │   ├── Home/              # Home screen components
│   │   │   ├── Odometer/          # Animated number display
│   │   │   ├── Profile/           # User profile components
│   │   │   └── Trade/             # Trading UI components
│   │   ├── screens/               # App screens
│   │   │   ├── CoinDetail/        # Individual coin view
│   │   │   ├── Home/              # Main portfolio view
│   │   │   ├── Profile/           # User profile
│   │   │   ├── Search/            # Coin search
│   │   │   ├── Send/              # Send crypto
│   │   │   ├── Settings/          # App settings
│   │   │   ├── TermsOfService/    # Legal
│   │   │   ├── Trade/             # Trading interface
│   │   │   ├── WalletSetup/       # Wallet onboarding
│   │   │   └── XStocks/           # Experimental features
│   │   ├── services/              # API & business logic
│   │   │   └── grpc/             # gRPC client
│   │   ├── store/                # Zustand state management
│   │   │   ├── coins.ts          # Coin data store
│   │   │   ├── portfolio.ts      # Portfolio store
│   │   │   ├── theme.ts          # Theme preferences
│   │   │   └── transactions.ts   # Transaction history
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Utility functions
│   │   └── gen/                  # Generated protobuf types
│   └── maestro/                   # E2E test flows
├── deploy/
│   └── dashboards/               # Grafana dashboard configs
└── Makefile                      # Build & run commands
```

## Architecture

### Backend Structure
- **gRPC Services**: 
  - CoinService - Coin discovery, trending, search
  - TradeService - Swap quotes, preparation, execution
  - PriceService - Real-time prices, historical data
  - WalletService - Balance checking, transaction history
  - UtilityService - System utilities, health checks
- **Repository Pattern**: Database abstraction with PostgreSQL + GORM
- **Caching**: Multi-layer caching with Redis/in-memory for API responses
- **External APIs**: 
  - Jupiter (DEX aggregator for swaps)
  - Birdeye (market data, token info)
  - Solana RPC (blockchain interaction)
  - IPFS/Pinata (metadata fetching)
- **Authentication**: Firebase App Check integration
- **Image Handling**: Proxy service with S3 upload for logos

### Frontend Structure
- **React Native + Expo**: Cross-platform mobile app (iOS focus)
- **gRPC-Web**: Frontend-backend communication via Connect protocol
- **State Management**: Zustand stores (coins, portfolio, theme, transactions)
- **Navigation**: React Navigation v7 with bottom tabs
- **Charts**: Victory Native for price charts, Skia for advanced graphics
- **Wallet Integration**: Solana wallet adapter for transaction signing

### Component Organization
Every component/screen follows this mandatory structure:
```
ComponentName/
├── index.tsx                    # Main component (JSX + minimal logic only)
├── componentname_scripts.ts     # ALL business logic and utilities
├── componentname_styles.ts      # All styled-components/styles
├── componentname_types.ts       # TypeScript interfaces and types
└── ComponentName.test.tsx       # Test file (if applicable)
```

**Critical Rules:**
- Extract ALL business logic to `scripts.ts` files
- Keep `index.tsx` purely presentational
- No inline styles - use `styles.ts`
- No business logic in components

### Testing Strategy
- **Unit Tests**: Jest for logic in `scripts.ts`, services, stores, utils
- **E2E Tests**: Maestro for UI flows (replacing React Native Testing Library)
- **Backend Tests**: Go testing with mockery-generated mocks
- **Coverage**: Logic-focused, excludes UI components

### Key Technologies
- **Backend**: Go 1.24, gRPC, PostgreSQL, Redis, Firebase
- **Frontend**: React Native 0.79, Expo 53, TypeScript, Zustand
- **Solana**: web3.js, Jupiter aggregator, birdeye market data, wallet integration
- **Development**: ESLint, Jest, Maestro, Buf (protobuf)

## Development Guidelines

### Code Standards
- All file paths must include `frontend/` prefix for linting
- Follow existing patterns for gRPC service implementations
- Implement proper error handling with user-friendly messages
- Use project-specific naming related to meme trading context

### Database
- Use repository pattern for data access
- GORM for ORM with PostgreSQL

### Trading Logic
- Birdeye for market data
- Jupiter integration for DEX operations
- Quote → Prepare → Submit flow for trades
- Real-time price history via Birdeye API
- Comprehensive fee calculations (Jupiter + network fees)

### Performance
- Multi-layer caching strategy
- Efficient protobuf serialization
- Optimized React Native rendering

### Security
- Firebase App Check for API protection
- Never expose private keys or sensitive data
- Input validation on all endpoints
- Secure keychain storage for wallet data
- Multi-language banned words filtering for user-generated content

### Banned Words Management
The system includes comprehensive banned words filtering across 28 languages:
- `--populate-naughty-words` flag downloads all languages automatically
- Standalone utility: `go run cmd/banned-words-manager/main.go`
- Languages include: Arabic, Czech, Danish, German, English, Spanish, French, Hindi, Japanese, Korean, Russian, Chinese, and more
- Words stored with language codes for targeted filtering

## Lint & Build Requirements

Always run these commands before committing:
- Frontend: `yarn lint` (auto-fixes many issues)
- Backend: `make backend-test` (includes compilation check)
- E2E: `make test:e2e:all` for full flow validation

## Environment Setup

Use provided setup scripts:
- `./setup-frontend.sh` - NVM, Node.js, Yarn, dependencies
- `./setup-backend.sh` - Go, buf, protoc, mockery, dependencies

Both scripts create `.env` files from examples that require manual configuration.

## Critical Known Issues & Fixes

### Native SOL vs wSOL Handling (Fixed 2025-07-10)

**Issue**: Swaps involving native SOL (address: `11111111111111111111111111111111`) were failing with "incorrect program id for instruction" error when trying to create ATAs.

**Root Cause**: 
- Native SOL is not a token and doesn't use the SPL Token program
- Jupiter API only accepts wSOL (`So11111111111111111111111111111111111111112`)
- The system was trying to create ATAs for native SOL, which is invalid

**Solution**:
1. **Address Normalization**: Convert native SOL to wSOL before Jupiter API calls
   - In `PrepareSwap`: Normalize `FromCoinMintAddress` and `ToCoinMintAddress`
   - In `GetSwapQuote`: Already had normalization (kept working)
   - In `FeeMintSelector`: Added normalization for fee mint selection

2. **Key Code Changes**:
   ```go
   // backend/internal/service/trade/service.go
   normalizedFromMint := params.FromCoinMintAddress
   if params.FromCoinMintAddress == model.NativeSolMint {
       normalizedFromMint = model.SolMint
   }
   ```

   ```go
   // backend/internal/service/trade/fee_mint_selector.go
   // In SelectFeeMint, ensure native SOL is converted to wSOL
   if selectedFeeMint == nativeSolMint {
       selectedFeeMint = WSOLMint
   }
   ```

3. **Safety Checks**: Added conversions in ATA creation functions to prevent attempts to create ATAs for native SOL

**Testing**:
- `cmd/test-sol-swap/` - Validates Jupiter API behavior
- `cmd/test-fee-mint/` - Tests fee mint selection
- `cmd/validate-sol-swap/` - Comprehensive end-to-end validation
- Unit tests in `sol_normalization_test.go`

**Important Notes**:
- Frontend still shows native SOL separately from wSOL for user clarity
- Database maintains separate entries for SOL and wSOL
- Price data is synchronized between them
- The normalization is transparent to users