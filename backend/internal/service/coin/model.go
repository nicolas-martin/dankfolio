package coin

import (
	"github.com/nicolas-martin/dankfolio/internal/model"
)

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

// JupiterPriceResponse represents the response from Jupiter Price API V2
type JupiterPriceResponse struct {
	Data      map[string]JupiterTokenData `json:"data"`
	TimeTaken float64                     `json:"timeTaken"`
}

// JupiterTokenData represents price data for a specific token
type JupiterTokenData struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	Price     string            `json:"price"`
	ExtraInfo *JupiterExtraInfo `json:"extraInfo,omitempty"`
}

// JupiterExtraInfo contains additional price information like confidence levels
type JupiterExtraInfo struct {
	LastSwappedPrice *JupiterLastSwappedPrice `json:"lastSwappedPrice,omitempty"`
	QuotedPrice      *JupiterQuotedPrice      `json:"quotedPrice,omitempty"`
	ConfidenceLevel  string                   `json:"confidenceLevel,omitempty"`
}

// JupiterLastSwappedPrice contains info about the last swap transaction
type JupiterLastSwappedPrice struct {
	LastJupiterSellAt    int64  `json:"lastJupiterSellAt,omitempty"`
	LastJupiterSellPrice string `json:"lastJupiterSellPrice,omitempty"`
	LastJupiterBuyAt     int64  `json:"lastJupiterBuyAt,omitempty"`
	LastJupiterBuyPrice  string `json:"lastJupiterBuyPrice,omitempty"`
}

// JupiterQuotedPrice contains current buy and sell price information
type JupiterQuotedPrice struct {
	BuyPrice  string `json:"buyPrice,omitempty"`
	BuyAt     int64  `json:"buyAt,omitempty"`
	SellPrice string `json:"sellPrice,omitempty"`
	SellAt    int64  `json:"sellAt,omitempty"`
}

// JupiterTokenInfoResponse represents the detailed token information from Jupiter API
type JupiterTokenInfoResponse struct {
	Address     string   `json:"address"`
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Decimals    int      `json:"decimals"`
	LogoURI     string   `json:"logoURI"`
	Tags        []string `json:"tags,omitempty"`
	DailyVolume float64  `json:"daily_volume,omitempty"`
	CreatedAt   string   `json:"created_at,omitempty"`
}

// ToCoin converts a JupiterTokenInfoResponse to a model.Coin
func (j *JupiterTokenInfoResponse) ToCoin() model.Coin {
	return model.Coin{
		ID:          j.Address,
		Symbol:      j.Symbol,
		Name:        j.Name,
		IconUrl:     j.LogoURI,
		Description: "", // Empty description for now
		Decimals:    j.Decimals,
		Tags:        j.Tags,
		DailyVolume: j.DailyVolume,
	}
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

type CoinBirdeyeMetadata struct {
	Address    string `json:"address"`
	Symbol     string `json:"symbol"`
	Name       string `json:"name"`
	Decimals   int    `json:"decimals"`
	Extensions struct {
		CoingeckoID string `json:"coingecko_id"`
		Website     string `json:"website"`
		Twitter     string `json:"twitter"`
		Discord     string `json:"discord"`
		Medium      string `json:"medium"`
	} `json:"extensions"`
	LogoURI string `json:"logo_uri"`
}

type BirdEyeMetadataResponse struct {
	Data    CoinBirdeyeMetadata `json:"data"`
	Success bool                `json:"success"`
}

type CoinGeckoMetadata struct {
	ID         string   `json:"id"`
	Symbol     string   `json:"symbol"`
	Name       string   `json:"name"`
	Categories []string `json:"categories"`
	Links      struct {
		Homepage                  []string `json:"homepage"`
		Whitepaper                string   `json:"whitepaper"`
		BlockchainSite            []string `json:"blockchain_site"`
		TwitterScreenName         string   `json:"twitter_screen_name"`
		TelegramChannelIdentifier string   `json:"telegram_channel_identifier"`
		SubredditURL              string   `json:"subreddit_url"`
		ReposURL                  struct {
			Github    []string `json:"github"`
			Bitbucket []string `json:"bitbucket"`
		} `json:"repos_url"`
	} `json:"links"`
	Image struct {
		Thumb string `json:"thumb"`
		Small string `json:"small"`
		Large string `json:"large"`
	} `json:"image"`
	ContractAddress              string  `json:"contract_address"`
	SentimentVotesUpPercentage   float64 `json:"sentiment_votes_up_percentage"`
	SentimentVotesDownPercentage float64 `json:"sentiment_votes_down_percentage"`
	WatchlistPortfolioUsers      int     `json:"watchlist_portfolio_users"`
	MarketCapRank                int     `json:"market_cap_rank"`
	LastUpdated                  string  `json:"last_updated"`
}

// TokenMetadata represents the common metadata fields between different providers
type TokenMetadata struct {
	// Basic Info
	Address  string `json:"address"`
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	LogoURL  string `json:"logo_url"`
	Decimals int    `json:"decimals"`

	// Social Links
	Website  string `json:"website"`
	Twitter  string `json:"twitter"`
	Telegram string `json:"telegram"`
	Discord  string `json:"discord"`

	// External IDs
	CoingeckoID string `json:"coingecko_id"`
}

// FromBirdEye converts BirdEye metadata to the common format
func (t *TokenMetadata) FromBirdEye(data *CoinBirdeyeMetadata) {
	t.Address = data.Address
	t.Symbol = data.Symbol
	t.Name = data.Name
	t.LogoURL = data.LogoURI
	t.Website = data.Extensions.Website
	t.Twitter = data.Extensions.Twitter
	t.CoingeckoID = data.Extensions.CoingeckoID
	t.Discord = data.Extensions.Discord
}

// FromCoinGecko converts CoinGecko metadata to the common format
func (t *TokenMetadata) FromCoinGecko(data *CoinGeckoMetadata) {
	t.Address = data.ContractAddress
	t.Symbol = data.Symbol
	t.Name = data.Name
	t.LogoURL = data.Image.Large
	if len(data.Links.Homepage) > 0 {
		t.Website = data.Links.Homepage[0]
	}
	t.Twitter = data.Links.TwitterScreenName
	t.Telegram = data.Links.TelegramChannelIdentifier
}

// Jupiter API endpoints
const (
	jupiterBaseURL       = "https://quote-api.jup.ag/v6"
	jupiterTokenInfoURL  = "https://api.jup.ag/tokens/v1/token"
	jupiterV6APIPriceURL = "https://price.jup.ag/v4/price?ids=%s"
	jupiterQuoteURL      = jupiterBaseURL + "/quote"
)

// JupiterQuoteResponse represents the response from Jupiter's quote endpoint
type JupiterQuoteResponse struct {
	InputMint            string `json:"inputMint"`
	OutputMint           string `json:"outputMint"`
	Amount               string `json:"amount"`
	InAmount             string `json:"inAmount"`
	OutAmount            string `json:"outAmount"`
	OtherAmountThreshold string `json:"otherAmountThreshold"`
	SwapMode             string `json:"swapMode"`
	SlippageBps          int32  `json:"slippageBps"`
	PlatformFee          *struct {
		Amount string `json:"amount"`
		FeeBps int32  `json:"feeBps"`
	} `json:"platformFee,omitempty"`
	PriceImpactPct string `json:"priceImpactPct"`
	RoutePlan      []struct {
		SwapInfo struct {
			AmmKey     string `json:"ammKey"`
			Label      string `json:"label,omitempty"`
			InputMint  string `json:"inputMint"`
			OutputMint string `json:"outputMint"`
			InAmount   string `json:"inAmount"`
			OutAmount  string `json:"outAmount"`
			FeeAmount  string `json:"feeAmount"`
			FeeMint    string `json:"feeMint"`
			Percent    int32  `json:"percent"`
		} `json:"swapInfo"`
	} `json:"routePlan"`
	ContextSlot *int64   `json:"contextSlot,omitempty"`
	TimeTaken   *float64 `json:"timeTaken,omitempty"`
}

// QuoteParams represents all possible parameters for the Jupiter quote endpoint
type QuoteParams struct {
	InputMint                  string
	OutputMint                 string
	Amount                     string
	SlippageBps                int
	SwapMode                   string // "ExactIn" or "ExactOut"
	Dexes                      []string
	ExcludeDexes               []string
	RestrictIntermediateTokens bool
	OnlyDirectRoutes           bool
	AsLegacyTransaction        bool
	PlatformFeeBps             int
	MaxAccounts                int
}
