# Platform Fee Collection Guide

This guide explains how to set up and manage platform fee collection for the Dankfolio trading system.

## Overview

Platform fees are collected during swaps through Jupiter's fee mechanism. For fees to be collected successfully, the platform account must have Associated Token Accounts (ATAs) for the fee mints.

## Available Commands

### 1. `platform-fee-setup` - Original ATA Creator
Creates individual ATAs for the platform account.

```bash
# Check if SOL ATA exists
go run cmd/platform-fee-setup/main.go --account AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh --check

# Create SOL ATA
go run cmd/platform-fee-setup/main.go --account AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh --create-ata --private-key /path/to/key.json

# Create ATA for specific token
go run cmd/platform-fee-setup/main.go --account AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh --mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --create-ata --private-key /path/to/key.json
```

### 2. `platform-ata-setup` - Bulk ATA Setup (NEW)
Sets up ATAs for all common tokens in one command.

```bash
go run cmd/platform-ata-setup/main.go
```

This command:
- Checks ATAs for 10+ common tokens (SOL, USDC, USDT, BONK, etc.)
- Creates any missing ATAs automatically
- Reports the status of each token
- Ensures platform fees can be collected for popular tokens

### 3. `platform-fee-test` - Integration Test (NEW)
Tests the complete fee collection flow with a real swap.

```bash
go run cmd/platform-fee-test/main.go
```

This command:
- Creates ATAs if needed
- Performs a test swap with platform fees
- Verifies fees were collected
- Shows all platform account balances

## How Platform Fees Work

### Fee Collection Rules

According to Jupiter's documentation:
- **ExactIn swaps**: Fees come from input mint OR output mint
- **ExactOut swaps**: Fees come from input mint ONLY

### Why ATAs Matter

1. **No ATA = No Fees**: If the platform account doesn't have an ATA for the fee mint, Jupiter skips fee collection
2. **Pre-creation Required**: ATAs must exist BEFORE the swap transaction
3. **Cost**: Each ATA requires ~0.00203928 SOL for rent

### Trade Service Integration

The trade service (`PrepareSwap`) automatically:
1. Determines the optimal fee mint based on swap type
2. Checks if the platform ATA exists
3. Only passes the fee account to Jupiter if the ATA exists
4. Logs warnings when fees can't be collected

## Setup Instructions

### Initial Setup (One-time)

1. **Fund the platform account** with SOL for ATA rent:
   ```bash
   # Each ATA needs ~0.00203928 SOL
   # For 10 tokens: ~0.0204 SOL
   # Recommended: Send 0.1 SOL to be safe
   ```

2. **Run bulk ATA setup**:
   ```bash
   go run cmd/platform-ata-setup/main.go
   ```

3. **Verify setup** with a test swap:
   ```bash
   go run cmd/platform-fee-test/main.go
   ```

### Ongoing Maintenance

- **New tokens**: Run `platform-ata-setup` periodically to add ATAs for new popular tokens
- **Monitoring**: Check logs for "Platform fee account ATA does not exist" warnings
- **Testing**: Use `platform-fee-test` to verify fee collection after changes

## Environment Variables

Required in `.env`:
```env
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_RPC_API_KEY=your-api-key
JUPITER_API_URL=https://api.jup.ag
PLATFORM_FEE_ACCOUNT_ADDRESS=AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh
PLATFORM_FEE_BPS=100  # 1% fee
```

## Troubleshooting

### Fees Not Being Collected

1. **Check ATA exists**:
   ```bash
   go run cmd/check-ata/main.go
   ```

2. **Review trade logs** for warnings:
   ```
   "Platform fee account ATA does not exist, skipping fee collection"
   ```

3. **Create missing ATA**:
   ```bash
   go run cmd/platform-ata-setup/main.go
   ```

### Transaction Failures

- **Insufficient SOL**: Platform account needs SOL for rent
- **Wrong mint**: Ensure using correct mint addresses
- **Rate limits**: Jupiter API may rate limit during testing

## Best Practices

1. **Pre-create ATAs** for all tokens you expect to trade
2. **Monitor logs** for fee collection failures
3. **Test new tokens** before enabling in production
4. **Keep SOL balance** in platform account for future ATAs
5. **Document fee mints** that generate the most revenue

## Future Improvements

Consider implementing:
- Automatic ATA creation during swaps (using setup transactions)
- Dynamic fee mint selection based on liquidity
- Fee collection analytics and reporting
- Automated ATA creation for trending tokens