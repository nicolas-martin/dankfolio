# Platform Fees - Production Setup Guide

This guide documents the platform fee collection system for production deployment.

## Overview

Platform fees are collected automatically during swaps through Jupiter's fee mechanism. The system has been thoroughly tested and validated to ensure reliable fee collection across different swap scenarios.

## Platform Account Configuration

### Production Platform Account
- **Address**: `AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh`
- **Purpose**: Collects platform fees from all swaps
- **Fee Rate**: Configured via `PLATFORM_FEE_BPS` environment variable (100 = 1%)

### Environment Variables

Add to your production `.env`:
```env
PLATFORM_FEE_ACCOUNT_ADDRESS=AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh
PLATFORM_FEE_BPS=100  # 1% platform fee
```

## Fee Collection Logic

### Fee Mint Selection (Implemented in Trade Service)

The system automatically selects the optimal mint for fee collection:

1. **Swaps involving WSOL** (Coin → WSOL or WSOL → Coin):
   - Fees are always collected in WSOL
   - Reason: Better liquidity and easier to manage

2. **Token-to-Token swaps** (Coin1 → Coin2):
   - Fees are collected in the input mint
   - Example: USDC → BONK = fees in USDC

3. **ExactOut swaps**:
   - MUST use input mint only (Jupiter requirement)
   - No flexibility in mint selection

### Code Implementation

The logic is implemented in `/internal/service/trade/service.go`:
- Automatically detects swap type and tokens
- Selects appropriate fee mint
- Checks if platform ATA exists
- Only enables fee collection if ATA is available

## Initial Setup (One-time)

### 1. Fund Platform Account

The platform account needs SOL for:
- Creating ATAs (~0.00203928 SOL per ATA)
- Transaction fees for ATA creation
- Future operations

Recommended: Send at least 0.5 SOL to start.

### 2. Create ATAs for Common Tokens

Run the bulk setup command:
```bash
go run cmd/platform-ata-setup/main.go
```

This creates ATAs for:
- WSOL (Wrapped SOL)
- USDC
- USDT
- Popular meme coins (BONK, WIF, POPCAT, etc.)

### 3. Verify Setup

Check created ATAs:
```bash
go run cmd/check-ata/main.go
```

Test fee collection:
```bash
go run cmd/platform-fee-test/main.go
```

## Monitoring and Maintenance

### Daily Monitoring

1. **Check Fee Collection**:
   - Monitor platform account balances
   - Verify fees are being collected in expected tokens
   - Track fee collection rate vs swap volume

2. **Log Monitoring**:
   Look for these log messages:
   - ✅ Success: `"Platform fee collection enabled"`
   - ⚠️ Warning: `"Platform fee ATA does not exist - fees will not be collected"`

### Weekly Maintenance

1. **Create ATAs for New Tokens**:
   ```bash
   # Check trending tokens
   # Add new popular tokens to platform-ata-setup
   go run cmd/platform-ata-setup/main.go
   ```

2. **Balance Check**:
   - Ensure platform account has SOL for operations
   - Monitor which tokens are generating most fees

### Fee Withdrawal

Platform fees accumulate in various token ATAs. To withdraw:

1. **For WSOL**: Direct transfer or unwrap to SOL
2. **For Tokens**: Transfer to treasury or swap to stablecoin

## Troubleshooting

### Fees Not Being Collected

1. **Check ATA exists**:
   ```bash
   solana account <ATA_ADDRESS> --url mainnet-beta
   ```

2. **Review logs** for specific mint:
   ```
   grep "Platform fee ATA does not exist" app.log | grep <MINT_ADDRESS>
   ```

3. **Create missing ATA**:
   ```bash
   go run cmd/platform-fee-setup/main.go --mint <MINT_ADDRESS> --create-ata
   ```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No fees collected | Missing ATA | Create ATA for the token |
| Partial fee collection | Some ATAs missing | Run platform-ata-setup |
| Transaction fails | Insufficient SOL | Fund platform account |

## Security Considerations

1. **Private Key Management**:
   - Platform account private key should be stored securely
   - Use hardware wallet or secure key management service
   - Limit access to fee withdrawal functions

2. **Monitoring**:
   - Set up alerts for large fee collections
   - Monitor for unusual patterns
   - Regular audits of fee collection vs expected amounts

## Best Practices

1. **Pre-create ATAs** for all tokens you list
2. **Monitor logs** daily for missing ATAs
3. **Automate ATA creation** for new listings
4. **Regular withdrawals** to secure treasury
5. **Track metrics**:
   - Fee collection rate
   - Most profitable token pairs
   - Failed collections due to missing ATAs

## Metrics to Track

- Total fees collected (by token)
- Fee collection success rate
- Most profitable trading pairs
- Average fee per swap
- Missing ATA incidents

## Future Enhancements

Consider implementing:
1. Automatic ATA creation during token listing
2. Real-time fee collection dashboard
3. Automated fee consolidation to stablecoins
4. Alert system for missing ATAs