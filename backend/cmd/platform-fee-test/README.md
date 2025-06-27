# Platform Fee Test

This command tests the platform fee collection mechanism by:

1. **Automatically creating ATAs** for the platform account if they don't exist
2. **Performing test swaps** in all three scenarios (Coin→WSOL, WSOL→Coin, Coin1→Coin2)
3. **Verifying fee collection** in the platform account for each swap type

## How it works

### Fee Collection Rules (from Jupiter docs)

Platform fees must come from specific mints:
- **ExactIn swaps**: Input mint or output mint
- **ExactOut swaps**: Input mint ONLY

### Fee Mint Selection Logic

The updated test command tests three swap scenarios:

1. **Coin → WSOL**: Should collect fees in WSOL (preferred when available)
2. **WSOL → Coin**: Should collect fees in WSOL (preferred when available)
3. **Coin1 → Coin2**: Should collect fees in one of the tokens (typically input mint)

The selection priority is:
1. Use Jupiter's recommended fee mint (from quote response)
2. If WSOL is involved, prefer WSOL for better liquidity
3. For token-to-token swaps, use input mint
4. Fall back to any available ATA

The command automatically:
1. Checks if the platform account has ATAs for all test mints
2. Creates any missing ATAs using the platform's private key
3. Performs three test swaps with different token pairs
4. Tracks balances and verifies fee collection for each swap
5. Reports which tokens received fees

### Key Features

- **Automatic ATA creation**: No manual setup needed - the command creates ATAs as required
- **Smart fee account selection**: Chooses the correct ATA based on swap type and available mints
- **Transaction confirmation**: Waits for all transactions to be finalized
- **Balance verification**: Shows all token balances in the platform account after the swap

## Usage

```bash
# From the backend directory
go run cmd/platform-fee-test/main.go
```

## Configuration

The command uses hardcoded values for testing:

- **Platform Account** (fee collector): `AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh`
- **Test Wallet**: `GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R`
- **Input Token**: `4UKgmUvSeKuzkh4L6qH82KQ5Rfy3uetadKpDT5Bupr8h`
- **Output Token**: SOL (wrapped as WSOL)
- **Swap Amount**: 1 token (1000000 raw units)
- **Platform Fee**: 1% (100 basis points)

## Output Example

```
2024/06/27 10:30:00 INFO Step 1: Checking platform account ATAs...
2024/06/27 10:30:01 INFO ✅ Platform ATA already exists mint=4UKgmUvSeKuzkh4L6qH82KQ5Rfy3uetadKpDT5Bupr8h ata=...
2024/06/27 10:30:01 INFO ❌ Platform ATA does not exist, creating... mint=So11111111111111111111111111111111111111112 ata=...
2024/06/27 10:30:03 INFO ✅ ATA creation transaction sent signature=... ata=...
2024/06/27 10:30:05 INFO Step 2: Getting swap quote from Jupiter...
2024/06/27 10:30:06 INFO Quote received input_amount=1000000 output_amount=25000 price_impact=0.001
2024/06/27 10:30:06 INFO Step 3: Creating swap transaction...
2024/06/27 10:30:07 INFO Step 5: Executing swap transaction...
2024/06/27 10:30:10 INFO ✅ Transaction finalized
2024/06/27 10:30:12 INFO Token balance mint="So11111111111111111111111111111111111111112 (SOL)" balance=0.00025
2024/06/27 10:30:12 INFO ✅ Platform fee test completed successfully!
```

## Troubleshooting

### ATA Creation Fails
- Ensure the platform account has enough SOL for rent (0.00203928 SOL per ATA)
- Check that the private key matches the platform address

### Swap Fails
- Verify the test wallet has enough input tokens
- Ensure the test wallet has SOL for transaction fees
- Check that slippage tolerance is appropriate for the token pair

### No Fees Collected
- Confirm the platform ATA exists for the fee mint
- Check Jupiter logs to see which mint was chosen for fees
- Verify the platform fee percentage is set correctly

## Integration with Trade Service

The trade service (`internal/service/trade/service.go`) automatically:
1. Checks if platform ATAs exist before swaps
2. Skips fee collection if ATAs are missing
3. Logs warnings when fees can't be collected

This test command helps ensure ATAs are pre-created so fees are never missed.