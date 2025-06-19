package jupiter

import (
	"encoding/json"
	"log/slog"
	"strconv"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// JupiterSwapResponse is used to unmarshal the swap transaction response
type JupiterSwapResponse struct {
	SwapTransaction string `json:"swapTransaction"`
}

// SwapResponse represents the complete response from Jupiter's /swap endpoint
type SwapResponse struct {
	SwapTransaction           string                `json:"swapTransaction"`
	SetupTransaction          string                `json:"setupTransaction,omitempty"`
	CleanupTransaction        string                `json:"cleanupTransaction,omitempty"`
	LastValidBlockHeight      int64                 `json:"lastValidBlockHeight"`
	PrioritizationFeeLamports int64                 `json:"prioritizationFeeLamports"`
	ComputeUnitLimit          int64                 `json:"computeUnitLimit"`
	PrioritizationType        PrioritizationType    `json:"prioritizationType"`
	DynamicSlippageReport     DynamicSlippageReport `json:"dynamicSlippageReport"`
	SimulationError           any                   `json:"simulationError"`
}

// PrioritizationType represents priority fee calculation details
type PrioritizationType struct {
	ComputeBudget ComputeBudget `json:"computeBudget"`
}

// ComputeBudget represents compute budget details
type ComputeBudget struct {
	MicroLamports          int64 `json:"microLamports"`
	EstimatedMicroLamports int64 `json:"estimatedMicroLamports"`
}

// DynamicSlippageReport represents the dynamic slippage calculation results
type DynamicSlippageReport struct {
	SlippageBps                  int    `json:"slippageBps"`
	OtherAmount                  int64  `json:"otherAmount"`
	SimulatedIncurredSlippageBps int    `json:"simulatedIncurredSlippageBps"`
	AmplificationRatio           string `json:"amplificationRatio"`
}

// PriceResponse represents the response from Jupiter Price API V2
type PriceResponse struct {
	Data map[string]CoinData `json:"data"`
}

// CoinData represents price data for a specific token
type CoinData struct {
	Price     string     `json:"price"`
	ExtraInfo *ExtraInfo `json:"extraInfo,omitempty"`
}

// ExtraInfo contains additional price information like confidence levels
type ExtraInfo struct {
	LastSwappedPrice *LastSwappedPrice `json:"lastSwappedPrice,omitempty"`
	QuotedPrice      *QuotedPrice      `json:"quotedPrice,omitempty"`
}

// LastSwappedPrice contains info about the last swap transaction
type LastSwappedPrice struct {
	LastJupiterSellAt    int64  `json:"lastJupiterSellAt,omitempty"`
	LastJupiterSellPrice string `json:"lastJupiterSellPrice,omitempty"`
	LastJupiterBuyAt     int64  `json:"lastJupiterBuyAt,omitempty"`
	LastJupiterBuyPrice  string `json:"lastJupiterBuyPrice,omitempty"`
}

// QuotedPrice contains current buy and sell price information
type QuotedPrice struct {
	BuyPrice  string `json:"buyPrice,omitempty"`
	SellPrice string `json:"sellPrice,omitempty"`
}

// CoinInfoResponse represents the response from Jupiter's token info API
type CoinInfoResponse struct {
	Address     string         `json:"address"`
	ChainID     int            `json:"chainId"`
	Decimals    int            `json:"decimals"`
	Name        string         `json:"name"`
	Symbol      string         `json:"symbol"`
	LogoURI     string         `json:"logoURI"`
	Extensions  map[string]any `json:"extensions"`
	DailyVolume float64        `json:"dailyVolume"`
	Tags        []string       `json:"tags"`
	CreatedAt   time.Time      `json:"createdAt"`
}

// SwapInfo represents information about a swap in a route
type SwapInfo struct {
	Label     string `json:"label"`
	FeeMint   string `json:"feeMint"`
	FeeAmount string `json:"feeAmount"`
}

// RoutePlan represents a step in the swap route
type RoutePlan struct {
	SwapInfo SwapInfo `json:"swapInfo"`
}

// QuoteResponse represents the response from Jupiter's quote endpoint
type QuoteResponse struct {
	InputMint            string       `json:"inputMint"`
	OutputMint           string       `json:"outputMint"`
	InAmount             string       `json:"inAmount"`
	OutAmount            string       `json:"outAmount"`
	OtherAmountThreshold string       `json:"otherAmountThreshold"`
	SwapMode             string       `json:"swapMode"`
	SlippageBps          int          `json:"slippageBps"`
	PriceImpactPct       string       `json:"priceImpactPct"`
	RoutePlan            []RoutePlan  `json:"routePlan"`
	ContextSlot          int64        `json:"contextSlot"`
	TimeTaken            float64      `json:"timeTaken"`
	PlatformFee          *PlatformFee `json:"platformFee,omitempty"`

	// RawPayload stores the original JSON response from Jupiter for use in swap requests
	RawPayload json.RawMessage `json:"-"`
}

// PlatformFee represents the platform fee information in a quote
type PlatformFee struct {
	Amount   string `json:"amount"`
	FeeBps   int    `json:"feeBps"`
	FeeMint  string `json:"feeMint"`
	FeeToken string `json:"feeToken"`
}

// QuoteParams represents all possible parameters for the Jupiter quote endpoint
type QuoteParams struct {
	InputMint           string `json:"inputMint"`
	OutputMint          string `json:"outputMint"`
	Amount              string `json:"amount"`
	SwapMode            string `json:"swapMode,omitempty"`
	SlippageBps         int    `json:"slippageBps,omitempty"`
	FeeBps              int    `json:"feeBps,omitempty"`
	OnlyDirectRoutes    bool   `json:"onlyDirectRoutes,omitempty"`
	AsLegacyTransaction bool   `json:"asLegacyTransaction,omitempty"`
}

// CoinListResponse represents the response from Jupiter's token list API
type CoinListResponse struct {
	Coins []CoinListInfo `json:"tokens"`
}

// CoinListInfo represents detailed token information from Jupiter's token list
type CoinListInfo struct {
	Address      string         `json:"address"`
	ChainID      int            `json:"chainId"`
	Decimals     int            `json:"decimals"`
	Name         string         `json:"name"`
	Symbol       string         `json:"symbol"`
	LogoURI      string         `json:"logoURI"`
	Extensions   map[string]any `json:"extensions"`
	DailyVolume  float64        `json:"dailyVolume"`
	Tags         []string       `json:"tags"`
	CreatedAt    time.Time      `json:"createdAt"`
	CoingeckoID  string         `json:"coingeckoId,omitempty"`
	PriceUSD     float64        `json:"priceUsd,omitempty"`
	MarketCapUSD float64        `json:"marketCapUsd,omitempty"`
	Volume24h    float64        `json:"volume24h,omitempty"`
	Change24h    float64        `json:"change24h,omitempty"`
}

// convert to model.Coin
func (t *CoinListInfo) ToModelCoin() *model.Coin {
	return &model.Coin{
		Address:               t.Address,
		Name:                  t.Name,
		Symbol:                t.Symbol,
		Decimals:              t.Decimals,
		Description:           "",
		LogoURI:               t.LogoURI,
		Tags:                  t.Tags,
		Price:                 t.PriceUSD,
		Price24hChangePercent: t.Change24h,
		Marketcap:             t.MarketCapUSD,
		Volume24hUSD:          t.Volume24h,
		Website:               "",
		Twitter:               "",
		Telegram:              "",
		Discord:               "",
		CreatedAt:             "",
		LastUpdated:           "",
	}
}

// ToRawCoin converts CoinListInfo to model.RawCoin
func (t *CoinListInfo) ToRawCoin() *model.RawCoin {
	var jupiterCreatedAtTime time.Time
	if !t.CreatedAt.IsZero() {
		jupiterCreatedAtTime = t.CreatedAt
	}

	return &model.RawCoin{
		Address:          t.Address,
		Name:             t.Name,
		Symbol:           t.Symbol,
		Decimals:         t.Decimals,
		LogoUrl:          t.LogoURI,
		UpdatedAt:        time.Now().Format(time.RFC3339),
		JupiterCreatedAt: jupiterCreatedAtTime,
	}
}

// SwapQuoteRequestBody represents the structure sent as quoteResponse in the Jupiter swap transaction request
type SwapQuoteRequestBody struct {
	EstimatedAmount string   `json:"estimated_amount"`
	ExchangeRate    string   `json:"exchange_rate"`
	Fee             string   `json:"fee"`
	PriceImpact     string   `json:"price_impact"`
	RoutePlan       []string `json:"route_plan"`
	InputMint       string   `json:"input_mint"`
	OutputMint      string   `json:"output_mint"`
}

// NewCoinsParams represents pagination parameters for the GetNewCoins endpoint
type NewCoinsParams struct {
	Limit  int `json:"limit,omitempty"`  // How many records to output in the result
	Offset int `json:"offset,omitempty"` // The offset into the result set, used with limit to page through data
}

// NewTokenInfo represents a token from Jupiter's /tokens/v1/new endpoint
// This endpoint uses different field names than the standard token list
type NewTokenInfo struct {
	Mint              string   `json:"mint"`                // Mint address (equivalent to Address)
	CreatedAt         string   `json:"created_at"`          // Unix timestamp as string
	MetadataUpdatedAt float64  `json:"metadata_updated_at"` // Unix timestamp as number
	Name              string   `json:"name"`
	Symbol            string   `json:"symbol"`
	Decimals          int      `json:"decimals"`
	LogoURI           string   `json:"logo_uri"` // Note: logo_uri not logoURI
	KnownMarkets      []string `json:"known_markets"`
	MintAuthority     any      `json:"mint_authority"`   // Can be null
	FreezeAuthority   any      `json:"freeze_authority"` // Can be null
}

// ToRawCoin converts NewTokenInfo to model.RawCoin
func (t *NewTokenInfo) ToRawCoin() *model.RawCoin {
	var jupiterCreatedAtTime time.Time
	if t.CreatedAt != "" {
		unixTimestamp, err := strconv.ParseInt(t.CreatedAt, 10, 64)
		if err != nil {
			slog.Error("Failed to parse Jupiter CreatedAt timestamp", "value", t.CreatedAt, "error", err)
			// jupiterCreatedAtTime remains nil
		} else {
			tm := time.Unix(unixTimestamp, 0)
			jupiterCreatedAtTime = tm
		}
	}

	return &model.RawCoin{
		Address:          t.Mint, // Use Mint field instead of Address
		Name:             t.Name,
		Symbol:           t.Symbol,
		Decimals:         t.Decimals,
		LogoUrl:          t.LogoURI, // Use LogoURI field
		UpdatedAt:        time.Now().Format(time.RFC3339),
		JupiterCreatedAt: jupiterCreatedAtTime,
	}
}

// ToModelCoin converts NewTokenInfo to model.Coin
func (t *NewTokenInfo) ToModelCoin() *model.Coin {
	return &model.Coin{
		Address:               t.Mint, // Use Mint field instead of Address
		Name:                  t.Name,
		Symbol:                t.Symbol,
		Decimals:              t.Decimals,
		Description:           "",
		LogoURI:               t.LogoURI,  // Use LogoURI field
		Tags:                  []string{}, // New tokens don't have tags initially
		Price:                 0,          // Price not available in new tokens endpoint
		Price24hChangePercent: 0,
		Marketcap:             0,
		Volume24hUSD:          0,
		Website:               "",
		Twitter:               "",
		Telegram:              "",
		Discord:               "",
		CreatedAt:             "",
		LastUpdated:           "",
	}
}

// NewTokensResponse represents the response from Jupiter's /tokens/v1/new endpoint
type NewTokensResponse struct {
	Tokens []NewTokenInfo `json:"tokens"`
}
