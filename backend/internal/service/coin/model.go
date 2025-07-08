package coin

import (
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Config holds the configuration for the coin service
type Config struct {
	BirdEyeBaseURL          string
	BirdEyeAPIKey           string
	SolanaRPCEndpoint       string
	NewCoinsFetchInterval   time.Duration
	TrendingFetchInterval   time.Duration
	TopGainersFetchInterval time.Duration
	InitializeXStocksOnStartup bool
}

// --- Structs for Trending Tokens Output ---

// TrendingTokensOutput matches the top-level structure for the trending tokens data.
type TrendingTokensOutput struct {
	FetchTimestamp time.Time    `json:"fetchTimestamp"`
	Coins          []model.Coin `json:"coins"` // Contains fully enriched Coin models
}

// --- End Trending Tokens Output Structs ---
// TokenInfo represents a token from the Raydium API
type TokenInfo struct {
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	Mint     string `json:"mint"` // This is the ID we'll use
	Decimals int    `json:"decimals"`
	LogoURI  string `json:"logoURI"`
}

// RaydiumPool represents a liquidity pool from the Raydium API
type RaydiumPool struct {
	ID            string `json:"id"`
	BaseMint      string `json:"baseMint"`
	QuoteMint     string `json:"quoteMint"`
	BaseDecimals  int    `json:"baseDecimals"`
	QuoteDecimals int    `json:"quoteDecimals"`
	MarketID      string `json:"marketId"`
}

// TokenPoolInfo combines token information with its pools
type TokenPoolInfo struct {
	Token TokenInfo     `json:"token"`
	Pools []RaydiumPool `json:"pools"`
}

// TokenPoolInfoList represents the JSON structure of our token data file
type TokenPoolInfoList struct {
	Tokens []TokenPoolInfo `json:"tokens"`
}

// RaydiumTokenResponse represents the token list API response
type RaydiumTokenResponse struct {
	Official   []TokenInfo `json:"official"`
	Unofficial []TokenInfo `json:"unOfficial"`
}

// RaydiumPoolsResponse represents the pools API response
type RaydiumPoolsResponse struct {
	Name       string        `json:"name"`
	Official   []RaydiumPool `json:"official"`
	Unofficial []RaydiumPool `json:"unOfficial"`
}

// TokenList represents the structure of trimmed_mainnet.json
type TokenList struct {
	Tokens []struct {
		Token struct {
			Symbol   string `json:"symbol"`
			Name     string `json:"name"`
			Mint     string `json:"mint"`
			Decimals int    `json:"decimals"`
		} `json:"token"`
		Pools []struct {
			ID string `json:"id"`
		} `json:"pools"`
	} `json:"tokens"`
}

// CoinGeckoMetadata represents the raw response from CoinGecko API
type CoinGeckoMetadata struct {
	ID     string `json:"id"`
	Symbol string `json:"symbol"`
	Name   string `json:"name"`
	Links  struct {
		Homepage                  []string `json:"homepage"`
		TwitterScreenName         string   `json:"twitter_screen_name"`
		TelegramChannelIdentifier string   `json:"telegram_channel_identifier"`
	} `json:"links"`
	Image struct {
		Large string `json:"large"`
	} `json:"image"`
	LastUpdated string `json:"last_updated"`
}
