package model

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

const (
	SolMint = "So11111111111111111111111111111111111111112"

	// Trade status constants
	TradeStatusPending   = "pending"
	TradeStatusSubmitted = "submitted"
	TradeStatusCompleted = "completed"
	TradeStatusFailed    = "failed"
)

// Coin represents a token or coin in the system (unified model)
type Coin struct {
	ID              uint64   `json:"id,omitempty"`
	MintAddress     string   `json:"mint_address"`
	Name            string   `json:"name"`
	Symbol          string   `json:"symbol"`
	Decimals        int      `json:"decimals"`
	Description     string   `json:"description"`
	IconUrl         string   `json:"icon_url"`
	ResolvedIconUrl string   `json:"resolved_icon_url,omitempty"`
	Tags            []string `json:"tags,omitempty"`

	// Price and Market Data
	Price     float64 `json:"price"`
	Change24h float64 `json:"change_24h,omitempty"`
	MarketCap float64 `json:"market_cap,omitempty"`
	Volume24h float64 `json:"volume24h,omitempty"`

	// Social and External Links
	Website  string `json:"website,omitempty"`
	Twitter  string `json:"twitter,omitempty"`
	Telegram string `json:"telegram,omitempty"`
	Discord  string `json:"discord,omitempty"`

	// Metadata
	CreatedAt       string     `json:"created_at,omitempty"`        // System's created_at for enriched record
	LastUpdated     string     `json:"last_updated,omitempty"`      // System's last_updated for enriched record
	JupiterListedAt *time.Time `json:"jupiter_listed_at,omitempty"` // New field: Time listed on Jupiter

	IsTrending bool `json:"is_trending,omitempty"`
}

// GetID implements the Entity interface
func (c Coin) GetID() string {
	return c.MintAddress
}

// Trade represents a cryptocurrency trade
type Trade struct {
	ID                     string     `json:"id"`
	UserID                 string     `json:"user_id"`
	FromCoinMintAddress    string     `json:"from_coin_mint_address"`
	FromCoinPKID           uint64     `json:"from_coin_pk_id,omitempty"`
	ToCoinMintAddress      string     `json:"to_coin_mint_address"`
	ToCoinPKID             uint64     `json:"to_coin_pk_id,omitempty"`
	CoinSymbol             string     `json:"coin_symbol"` // This might be redundant if From/ToCoin provides symbol, or useful for primary display
	Type                   string     `json:"type"`
	Amount                 float64    `json:"amount"`
	Price                  float64    `json:"price"`
	Fee                    float64    `json:"fee"`
	PlatformFeeAmount      float64    `json:"platform_fee_amount,omitempty"`
	PlatformFeePercent     float64    `json:"platform_fee_percent,omitempty"`
	PlatformFeeDestination string     `json:"platform_fee_destination,omitempty"`
	Status                 string     `json:"status"`
	TransactionHash        string     `json:"transaction_hash"`
	UnsignedTransaction    string     `json:"unsigned_transaction,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	CompletedAt            *time.Time `json:"completed_at,omitempty"`
	Confirmations          int32      `json:"confirmations"`
	Finalized              bool       `json:"finalized"`
	Error                  *string    `json:"error,omitempty"`
}

// GetID implements the Entity interface
func (t Trade) GetID() string {
	return t.ID
}

// TradeRequest represents a request to execute a trade
type TradeRequest struct {
	FromCoinMintAddress string  `json:"from_coin_mint_address"` // Changed from FromCoinID
	ToCoinMintAddress   string  `json:"to_coin_mint_address"`   // Changed from ToCoinID
	Amount              float64 `json:"amount"`
	SignedTransaction   string  `json:"signed_transaction"`
	UnsignedTransaction string  `json:"unsigned_transaction"`
}

// PrepareSwapRequestData represents the data required to prepare a swap transaction
type PrepareSwapRequestData struct {
	FromCoinMintAddress string `json:"from_coin_mint_address"`
	ToCoinMintAddress   string `json:"to_coin_mint_address"`
	Amount              string `json:"amount"` // Amount in smallest unit (e.g. lamports for SOL)
	SlippageBps         string `json:"slippage_bps"`
	UserWalletAddress   string `json:"user_wallet_address"`
}

// FilterAndSortCoins filters and sorts a list of coins based on search criteria
func FilterAndSortCoins(coins []Coin, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) []Coin {
	// Filter coins based on query and tags
	filtered := make([]Coin, 0)
	for _, coin := range coins {
		// Skip if volume is below minimum
		if coin.Volume24h < minVolume24h {
			continue
		}

		// Check if coin matches query (case-insensitive)
		if query != "" {
			queryMatch := false
			query = strings.ToLower(query)
			if strings.Contains(strings.ToLower(coin.Name), query) ||
				strings.Contains(strings.ToLower(coin.Symbol), query) ||
				strings.Contains(strings.ToLower(coin.MintAddress), query) {
				queryMatch = true
			}
			if !queryMatch {
				continue
			}
		}

		// Check if coin has all required tags
		if len(tags) > 0 {
			hasAllTags := true
			for _, tag := range tags {
				tagFound := false
				for _, coinTag := range coin.Tags {
					if strings.EqualFold(coinTag, tag) {
						tagFound = true
						break
					}
				}
				if !tagFound {
					hasAllTags = false
					break
				}
			}
			if !hasAllTags {
				continue
			}
		}

		filtered = append(filtered, coin)
	}

	// Sort filtered coins
	sort.Slice(filtered, func(i, j int) bool {
		var less bool
		switch sortBy {
		case "price_usd":
			less = filtered[i].Price < filtered[j].Price
		case "market_cap_usd":
			less = filtered[i].MarketCap < filtered[j].MarketCap
		case "volume_24h":
			fallthrough
		default:
			less = filtered[i].Volume24h < filtered[j].Volume24h
		}
		if sortDesc {
			return !less
		}
		return less
	})

	// Apply pagination
	start := int(offset)
	if start >= len(filtered) {
		return []Coin{}
	}
	end := min(int(offset+limit), len(filtered))
	return filtered[start:end]
}

// RawCoin represents a raw token from Jupiter without enrichment
type RawCoin struct {
	ID               uint64    `json:"id,omitempty"`
	MintAddress      string    `json:"mint_address"`
	Symbol           string    `json:"symbol"`
	Name             string    `json:"name"`
	Decimals         int       `json:"decimals"`
	LogoUrl          string    `json:"logo_url"`
	UpdatedAt        string    `json:"updated_at"`
	JupiterCreatedAt time.Time `json:"jupiter_created_at"`
}

// GetID implements the Entity interface
func (r RawCoin) GetID() string {
	return r.MintAddress
}

// // TokenBalance represents a token balance for a specific mint
// type TokenBalance struct {
// 	MintAddress string  `json:"mint_address"`
// 	Amount      float64 `json:"amount"`
// }

// ApiStat represents API call statistics for a specific endpoint on a given day.
// GORM tags have been added for auto-migration.
type ApiStat struct {
	ID           uint      `json:"id" gorm:"primaryKey;autoIncrement"`                          // Primary key
	ServiceName  string    `json:"service_name" gorm:"uniqueIndex:idx_service_endpoint_date"` // Name of the service
	EndpointName string    `json:"endpoint_name" gorm:"uniqueIndex:idx_service_endpoint_date"`// Name of the endpoint
	Date         time.Time `json:"date" gorm:"type:date;uniqueIndex:idx_service_endpoint_date"` // Date for the count
	Count        int       `json:"count"`                                                       // Number of API calls
}

// GetID implements the Entity interface by returning the ID as a string.
func (a ApiStat) GetID() string {
	return fmt.Sprintf("%d", a.ID) // Convert uint ID to string
}
