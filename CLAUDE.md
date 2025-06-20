# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dankfolio is a Solana-based meme coin trading application with a React Native frontend and Go backend. The system uses gRPC for communication and features real-time trading, portfolio tracking, and coin discovery.

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

### Frontend (run from `./frontend/`)
- `yarn test` - Run Jest tests (logic only, excludes UI tests)
- `yarn test:coverage` - Run tests with coverage report
- `yarn lint` - Run ESLint with auto-fix
- `yarn start:ios` - Run on iOS device/simulator
- `yarn test:e2e` - Run Maestro E2E tests

### Database
- `make psql` - Connect to PostgreSQL using .env DB_URL

## Architecture

### Backend Structure
- **gRPC Services**: CoinService, TradeService, PriceService, WalletService, UtilityService
- **Repository Pattern**: Database abstraction with PostgreSQL + GORM
- **Caching**: Multi-layer caching with Redis/in-memory for API responses
- **External APIs**: Jupiter (DEX), Birdeye (market data), Solana RPC
- **Authentication**: Firebase App Check integration

### Frontend Structure
- **React Native + Expo**: Cross-platform mobile app
- **gRPC-Web**: Frontend-backend communication via Connect protocol
- **State Management**: Zustand stores (coins, portfolio, auth, transactions)
- **Navigation**: React Navigation v7 with bottom tabs
- **Charts**: Victory Native for price charts, Skia for advanced graphics

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
