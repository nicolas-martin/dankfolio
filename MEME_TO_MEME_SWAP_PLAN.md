# Meme Coin to Meme Coin Swap Implementation Plan

## Overview
Implement direct meme coin to meme coin swaps using Jupiter's `onlyDirectRoutes` parameter to ensure swaps go through a single liquidity pool.

## Jupiter API Details

### Quote Endpoint
- URL: `https://api.jup.ag/swap/v1/quote`
- Key Parameter: `onlyDirectRoutes=true` - Forces routing through only one market
- Warning: May yield less favorable rates but ensures direct swaps

### Swap Endpoint
- URL: `https://api.jup.ag/swap/v1/swap`
- Accepts quote response from quote endpoint

## Implementation Steps

### 1. Create Test Command for Direct Jupiter Calls
Create `backend/cmd/test-meme-to-meme-swap/main.go`:

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

const (
    // Test with BONK -> WIF swap
    BONKMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    WIFMint  = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"
    
    jupiterQuoteURL = "https://api.jup.ag/swap/v1/quote"
    jupiterSwapURL  = "https://api.jup.ag/swap/v1/swap"
)

type QuoteRequest struct {
    InputMint         string `json:"inputMint"`
    OutputMint        string `json:"outputMint"`
    Amount            string `json:"amount"`
    SlippageBps       int    `json:"slippageBps"`
    OnlyDirectRoutes  bool   `json:"onlyDirectRoutes"`
}

type SwapRequest struct {
    QuoteResponse    json.RawMessage `json:"quoteResponse"`
    UserPublicKey    string          `json:"userPublicKey"`
    DynamicSlippage  bool            `json:"dynamicSlippage"`
}

func main() {
    // 1. Get quote for BONK -> WIF with onlyDirectRoutes
    quoteParams := fmt.Sprintf(
        "?inputMint=%s&outputMint=%s&amount=%s&slippageBps=%d&onlyDirectRoutes=%s",
        BONKMint, WIFMint, "1000000000", 50, "true",
    )
    
    resp, err := http.Get(jupiterQuoteURL + quoteParams)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
    
    quoteBody, _ := io.ReadAll(resp.Body)
    fmt.Printf("Quote Response: %s\n", string(quoteBody))
    
    // Check if direct route exists
    var quoteResp map[string]interface{}
    json.Unmarshal(quoteBody, &quoteResp)
    
    if err, hasErr := quoteResp["error"]; hasErr {
        fmt.Printf("No direct route available: %v\n", err)
        return
    }
    
    // 2. Test swap endpoint (would need wallet key)
    fmt.Println("\nDirect route found! Swap would proceed with this quote.")
}
```

### 2. Fee Calculation Analysis

For meme-to-meme swaps, we need to consider:

**Additional Costs:**
- **ATA Creation**: If user doesn't have ATA for output token, it costs 0.00203928 SOL
- **Two ATAs**: In worst case, user might need ATAs for both tokens
- **Jupiter Fee**: Platform fees if configured
- **Network Fee**: Standard transaction fee (~0.000005 SOL)

**Fee Calculation Update:**
```go
func calculateMemesToMemesFees(hasFromATA, hasToATA bool) uint64 {
    baseFee := uint64(5000) // 0.000005 SOL network fee
    ataRent := uint64(2039280) // 0.00203928 SOL per ATA
    
    totalFee := baseFee
    if !hasFromATA {
        totalFee += ataRent
    }
    if !hasToATA {
        totalFee += ataRent
    }
    
    return totalFee
}
```

### 3. Separate Function for Non-SOL Swaps

Create new methods in `backend/internal/service/trade/service.go`:

```go
// GetMemeToMemeQuote handles direct meme coin to meme coin quotes
func (s *TradeService) GetMemeToMemeQuote(params model.SwapQuoteParams) (*model.SwapQuote, error) {
    // Validate neither coin is SOL
    if params.FromCoinMintAddress == model.NativeSolMint || 
       params.FromCoinMintAddress == model.SolMint ||
       params.ToCoinMintAddress == model.NativeSolMint || 
       params.ToCoinMintAddress == model.SolMint {
        return nil, fmt.Errorf("use regular swap for SOL transactions")
    }
    
    // Force onlyDirectRoutes for meme-to-meme
    params.OnlyDirectRoutes = true
    
    // Get quote from Jupiter
    quote, err := s.jupiterClient.GetQuote(params)
    if err != nil {
        return nil, fmt.Errorf("no direct route available: %w", err)
    }
    
    // Calculate fees including potential ATA creation
    hasFromATA := s.walletService.HasTokenAccount(params.WalletAddress, params.FromCoinMintAddress)
    hasToATA := s.walletService.HasTokenAccount(params.WalletAddress, params.ToCoinMintAddress)
    
    additionalFees := calculateMemesToMemesFees(hasFromATA, hasToATA)
    quote.TotalFeeLamports += additionalFees
    
    return quote, nil
}

// PrepareMemeToMemeSwap prepares direct meme coin to meme coin swap
func (s *TradeService) PrepareMemeToMemeSwap(params model.PrepareSwapParams) (*model.PreparedSwap, error) {
    // Similar validation and preparation logic
    // Ensure onlyDirectRoutes is set in Jupiter request
    params.OnlyDirectRoutes = true
    
    return s.jupiterClient.PrepareSwap(params)
}
```

### 4. Test Command for Service

Create `backend/cmd/test-service-meme-swap/main.go`:

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/your-org/dankfolio/backend/internal/service/trade"
    "github.com/your-org/dankfolio/backend/internal/model"
)

func main() {
    // Initialize service
    tradeService := initializeTradeService()
    
    // Test BONK -> WIF swap
    params := model.SwapQuoteParams{
        FromCoinMintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
        ToCoinMintAddress:   "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", // WIF
        Amount:              1000000000, // 1000 BONK
        SlippageBps:         50,
        WalletAddress:       "test-wallet-address",
    }
    
    quote, err := tradeService.GetMemeToMemeQuote(params)
    if err != nil {
        log.Fatalf("Failed to get quote: %v", err)
    }
    
    fmt.Printf("Quote received:\n")
    fmt.Printf("- Input: %d %s\n", quote.InAmount, params.FromCoinMintAddress)
    fmt.Printf("- Output: %d %s\n", quote.OutAmount, params.ToCoinMintAddress)
    fmt.Printf("- Price Impact: %.2f%%\n", quote.PriceImpactPct)
    fmt.Printf("- Total Fees: %d lamports\n", quote.TotalFeeLamports)
}
```

### 5. Frontend Updates

Update `frontend/src/services/tradeService/tradeService.ts`:

```typescript
export const getSwapQuote = async (params: {
  fromCoin: Coin;
  toCoin: Coin;
  amount: string;
  slippageBps: number;
}): Promise<SwapQuote> => {
  const { fromCoin, toCoin, amount, slippageBps } = params;
  
  // Determine if this is a meme-to-meme swap
  const isMemeToMeme = 
    fromCoin.mintAddress !== NATIVE_SOL_MINT && 
    fromCoin.mintAddress !== WSOL_MINT &&
    toCoin.mintAddress !== NATIVE_SOL_MINT && 
    toCoin.mintAddress !== WSOL_MINT;
  
  const request: GetSwapQuoteRequest = {
    fromCoinMintAddress: fromCoin.mintAddress,
    toCoinMintAddress: toCoin.mintAddress,
    amount: amount,
    slippageBps: slippageBps,
    walletAddress: walletStore.getState().publicKey || '',
    // Add flag for meme-to-meme
    onlyDirectRoutes: isMemeToMeme,
  };
  
  try {
    const response = await client.getSwapQuote(request);
    return response;
  } catch (error) {
    // Handle no direct route error gracefully
    if (isMemeToMeme && error.message.includes('no direct route')) {
      throw new Error('No direct swap available between these tokens');
    }
    throw error;
  }
};
```

## Testing Strategy

1. **Unit Tests**: Test the new meme-to-meme functions with mocked Jupiter responses
2. **Integration Tests**: Use test commands to verify actual Jupiter API behavior
3. **E2E Tests**: Update Maestro tests to include meme-to-meme swap flows

## Rollout Plan

1. **Phase 1**: Deploy backend changes with feature flag
2. **Phase 2**: Test with limited set of liquid meme pairs (BONK/WIF, BONK/POPCAT)
3. **Phase 3**: Enable in frontend with clear UX for "no direct route" cases
4. **Phase 4**: Monitor success rates and user feedback

## Risk Mitigation

1. **Liquidity Issues**: Many meme pairs may not have direct liquidity
   - Solution: Clear error messages and fallback to multi-hop suggestion
   
2. **Higher Fees**: Direct routes often have worse rates
   - Solution: Show price comparison with multi-hop route
   
3. **ATA Creation Costs**: Users may be surprised by additional fees
   - Solution: Clear fee breakdown in UI before confirmation

## Success Metrics

- Successful meme-to-meme swap completion rate > 80%
- User satisfaction with direct swap feature
- No increase in failed transactions