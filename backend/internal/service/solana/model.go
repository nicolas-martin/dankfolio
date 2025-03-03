package solana

import (
	"errors"
)

const (
	// Raydium API endpoints
	raydiumBaseHost = "https://api.raydium.io"
	raydiumSwapHost = "https://transaction-v1.raydium.io"
	// Common token mints
	SolMint  = "So11111111111111111111111111111111111111112"
	USDCMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	// Default RPC endpoint
	defaultDevnetRPC = "https://api.mainnet-beta.solana.com"
)

var (
	// Error definitions
	ErrInvalidCoin  = errors.New("invalid coin")
	ErrInvalidTrade = errors.New("invalid trade parameters")
	ErrSwapFailed   = errors.New("swap transaction failed")
)

// PriorityFeeResponse represents the response from Raydium's priority fee endpoint
type PriorityFeeResponse struct {
	ID      string `json:"id"`
	Success bool   `json:"success"`
	Data    struct {
		Default struct {
			VH int64 `json:"vh"`
			H  int64 `json:"h"`
			M  int64 `json:"m"`
		} `json:"default"`
	} `json:"data"`
}

// SwapQuoteResponse represents the response from Raydium's swap quote endpoint
type SwapQuoteResponse struct {
	ID      string `json:"id"`
	Success bool   `json:"success"`
	Version string `json:"version"`
	Data    struct {
		SwapType             string  `json:"swapType"`
		InputMint            string  `json:"inputMint"`
		InputAmount          string  `json:"inputAmount"`
		OutputMint           string  `json:"outputMint"`
		OutputAmount         string  `json:"outputAmount"`
		OtherAmountThreshold string  `json:"otherAmountThreshold"`
		SlippageBps          int     `json:"slippageBps"`
		PriceImpactPct       float64 `json:"priceImpactPct"`
		ReferrerAmount       string  `json:"referrerAmount"`
		RoutePlan            []struct {
			PoolID            string   `json:"poolId"`
			InputMint         string   `json:"inputMint"`
			OutputMint        string   `json:"outputMint"`
			FeeMint           string   `json:"feeMint"`
			FeeRate           float64  `json:"feeRate"`
			FeeAmount         string   `json:"feeAmount"`
			RemainingAccounts []string `json:"remainingAccounts"`
			LastPoolPriceX64  string   `json:"lastPoolPriceX64"`
		} `json:"routePlan"`
	} `json:"data"`
}

// SwapTransactionResponse represents the response from Raydium's swap transaction endpoint
type SwapTransactionResponse struct {
	ID      string `json:"id"`
	Success bool   `json:"success"`
	Data    struct {
		TxID        string `json:"txId"`
		BlockNumber int64  `json:"blockNumber"`
	} `json:"data"`
}

// SwapParams represents the parameters for a swap operation
type SwapParams struct {
	FromCoinID    string  `json:"fromCoinId"`
	ToCoinID      string  `json:"toCoinId"`
	Amount        float64 `json:"amount"`
	Slippage      float64 `json:"slippage"`
	WalletAddr    string  `json:"walletAddr"`
	InputDecimals int     `json:"inputDecimals"`
}
