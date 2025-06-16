package model

import (
	"fmt"
	"sort"
	"strings"
	"time"

	pb "github.com/nicolas-martin/dankfolio/gen/go/dankfolio/v1" // Added pb import
	"google.golang.org/protobuf/types/known/timestamppb"      // Added timestamppb import
)

const (
	SolMint = "So11111111111111111111111111111111111111112"

	// Trade status constants - matching blockchain status strings
	TradeStatusPending   = "pending"
	TradeStatusPrepared  = "prepared"
	TradeStatusSubmitted = "submitted"
	TradeStatusProcessed = "Processed"
	TradeStatusConfirmed = "Confirmed"
	TradeStatusFinalized = "Finalized"
	TradeStatusFailed    = "Failed"
	TradeStatusUnknown   = "Unknown"
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
	Liquidity float64 `json:"liquidity,omitempty"`
	Volume24hChangePercent float64 `json:"volume_24h_change_percent,omitempty"`
	FDV float64 `json:"fdv,omitempty"`
	Rank int `json:"rank,omitempty"`
	Price24hChangePercent float64 `json:"price_24h_change_percent,omitempty"`
}

// GetID implements the Entity interface
func (c Coin) GetID() string {
	return c.MintAddress
}

// Trade represents a cryptocurrency trade
type Trade struct {
	ID                  uint    `json:"id"`
	UserID              string  `json:"user_id"`
	FromCoinMintAddress string  `json:"from_coin_mint_address"`
	FromCoinPKID        uint64  `json:"from_coin_pk_id,omitempty"`
	ToCoinMintAddress   string  `json:"to_coin_mint_address"`
	ToCoinPKID          uint64  `json:"to_coin_pk_id,omitempty"`
	CoinSymbol          string  `json:"coin_symbol"` // This might be redundant if From/ToCoin provides symbol, or useful for primary display
	Type                string  `json:"type"`
	Amount              float64 `json:"amount"`
	Price               float64 `json:"price"`

	// Fee Information
	Fee            float64 `json:"fee"`                        // Total fee in USD
	TotalFeeAmount float64 `json:"total_fee_amount,omitempty"` // Total fee amount in native units
	TotalFeeMint   string  `json:"total_fee_mint,omitempty"`   // Mint address of the token used for total fees

	// Platform Fee Information
	PlatformFeeAmount      float64 `json:"platform_fee_amount,omitempty"`      // Platform fee amount in native units
	PlatformFeePercent     float64 `json:"platform_fee_percent,omitempty"`     // Platform fee percentage (e.g., 0.2 for 0.2%)
	PlatformFeeMint        string  `json:"platform_fee_mint,omitempty"`        // Mint address of the token used for platform fees
	PlatformFeeDestination string  `json:"platform_fee_destination,omitempty"` // Account receiving platform fees

	// Route Fee Information (from Jupiter route plan)
	RouteFeeAmount  float64  `json:"route_fee_amount,omitempty"`  // Total route fees in native units
	RouteFeeMints   []string `json:"route_fee_mints,omitempty"`   // List of mints used for route fees
	RouteFeeDetails string   `json:"route_fee_details,omitempty"` // JSON string of detailed route fee breakdown

	// Price Impact
	PriceImpactPercent float64 `json:"price_impact_percent,omitempty"` // Price impact as percentage

	Status              string    `json:"status"`
	TransactionHash     string    `json:"transaction_hash"`
	UnsignedTransaction string    `json:"unsigned_transaction,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	CompletedAt         time.Time `json:"completed_at,omitempty"`
	Confirmations       int32     `json:"confirmations"`
	Finalized           bool      `json:"finalized"`
	Error               string    `json:"error,omitempty"`
}

// GetID implements the Entity interface
func (t Trade) GetID() string {
	return fmt.Sprintf("%d", t.ID)
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
	ServiceName  string    `json:"service_name" gorm:"uniqueIndex:idx_service_endpoint_date"`   // Name of the service
	EndpointName string    `json:"endpoint_name" gorm:"uniqueIndex:idx_service_endpoint_date"`  // Name of the endpoint
	Date         time.Time `json:"date" gorm:"type:date;uniqueIndex:idx_service_endpoint_date"` // Date for the count
	Count        int       `json:"count"`                                                       // Number of API calls
}

// GetID implements the Entity interface by returning the ID as a string.
func (a ApiStat) GetID() string {
	return fmt.Sprintf("%d", a.ID) // Convert uint ID to string
}

// ToProto converts a model.Coin to a pb.Coin
// Note: This requires the generated pb package to be imported,
// and the pb.Coin field names must match the generated Go struct.
// Also, time string to timestamppb.Timestamp conversion needs careful handling.
func (m *Coin) ToProto() (*pb.Coin, error) {
	if m == nil {
		return nil, nil
	}

	pbCoin := &pb.Coin{
		MintAddress:            m.MintAddress,
		Name:                   m.Name,
		Symbol:                 m.Symbol,
		Decimals:               int32(m.Decimals),
		Description:            m.Description,
		IconUrl:                m.IconUrl,
		ResolvedIconUrl:        &m.ResolvedIconUrl, // Assuming ResolvedIconUrl in pb.Coin is *string
		Tags:                   m.Tags,
		Price:                  m.Price,
		DailyVolume:            m.Volume24h, // Mapping model.Volume24h to pb.DailyVolume
		Website:                &m.Website,  // Assuming Website in pb.Coin is *string
		Twitter:                &m.Twitter,  // Assuming Twitter in pb.Coin is *string
		Telegram:               &m.Telegram, // Assuming Telegram in pb.Coin is *string
		IsTrending:             m.IsTrending,
		// Optional fields from proto mapped from model - direct mapping if type matches
		// Note: For optional double/int32 fields in proto, if the model has float64/int,
		// they are directly assigned. The receiving end handles nil if not set by sender,
		// but here we always send a value if present in model.
		// Protoc-gen-go uses pointers for optional scalar types other than bytes and string.
		// So, if model has float64, and proto has optional double, pb field should be *float64.
	}

	// Handle optional float64/int fields by wrapping with pointers if they are set (non-zero for numbers, non-empty for strings)
	// This depends on how protoc-gen-go generates optional scalar fields.
	// If pb.Coin fields are like *float64, *int32:
	if m.ResolvedIconUrl != "" {
		pbCoin.ResolvedIconUrl = &m.ResolvedIconUrl
	} else {
		pbCoin.ResolvedIconUrl = nil // Explicitly set to nil if empty, though a nil *string is default
	}
	if m.Website != "" {
		pbCoin.Website = &m.Website
	} else {
		pbCoin.Website = nil
	}
	if m.Twitter != "" {
		pbCoin.Twitter = &m.Twitter
	} else {
		pbCoin.Twitter = nil
	}
	if m.Telegram != "" {
		pbCoin.Telegram = &m.Telegram
	} else {
		pbCoin.Telegram = nil
	}

	// Price24hChangePercent from model.Coin maps to PriceChangePercentage_24H in proto
	// Assuming pb.Coin.PriceChangePercentage_24H is *float64
	if m.Price24hChangePercent != 0 { // Check if it's meaningfully set
		val := m.Price24hChangePercent
		pbCoin.PriceChangePercentage_24H = &val
	}
	// Volume24hUsd from proto maps from model.Volume24h as well (or a specific model field if exists)
	// Assuming pb.Coin.Volume_24HUsd is *float64
	if m.Volume24h != 0 { // Re-using Volume24h for this example, adjust if model has specific Volume24hUSD
		val := m.Volume24h
		pbCoin.Volume_24HUsd = &val
	}
	if m.Liquidity != 0 {
		val := m.Liquidity
		pbCoin.Liquidity = &val
	}
	// Volume24hChangePercent from model.Coin maps to Volume_24HChangePercent in proto
	if m.Volume24hChangePercent != 0 {
		val := m.Volume24hChangePercent
		pbCoin.Volume_24HChangePercent = &val
	}
	if m.FDV != 0 {
		val := m.FDV
		pbCoin.Fdv = &val
	}
	if m.MarketCap != 0 {
		val := m.MarketCap
		pbCoin.MarketCap = &val
	}
	if m.Rank != 0 {
		val := int32(m.Rank)
		pbCoin.Rank = &val
	}


	// Time string to timestamppb.Timestamp conversion
	// CreatedAt (assuming m.CreatedAt is a string like time.RFC3339)
	if m.CreatedAt != "" {
		t, err := time.Parse(time.RFC3339, m.CreatedAt)
		if err == nil {
			pbCoin.CreatedAt = timestamppb.New(t)
		} else {
			// Log error or handle: fmt.Errorf("failed to parse CreatedAt: %w", err)
			// For now, pbCoin.CreatedAt will remain nil if parsing fails
		}
	}

	// LastUpdated (assuming m.LastUpdated is a string like time.RFC3339)
	if m.LastUpdated != "" {
		t, err := time.Parse(time.RFC3339, m.LastUpdated)
		if err == nil {
			pbCoin.LastUpdated = timestamppb.New(t)
		} else {
			// Log error or handle
		}
	}

	// JupiterListedAt (*time.Time to timestamppb.Timestamp)
	if m.JupiterListedAt != nil {
		pbCoin.JupiterListedAt = timestamppb.New(*m.JupiterListedAt)
	}

	return pbCoin, nil
}

// CoinsToProto converts a slice of model.Coin to a slice of pb.Coin
func CoinsToProto(coins []model.Coin) ([]*pb.Coin, error) {
	pbCoins := make([]*pb.Coin, 0, len(coins))
	for i := range coins {
		pbCoin, err := coins[i].ToProto()
		if err != nil {
			// Handle error for individual conversion, e.g., log it and skip, or return error
			return nil, fmt.Errorf("error converting coin %s to proto: %w", coins[i].Symbol, err)
		}
		if pbCoin != nil {
			pbCoins = append(pbCoins, pbCoin)
		}
	}
	return pbCoins, nil
}

// Import aliases for generated pb types and timestamppb
// These would typically be at the top of the file.
// import pb "github.com/nicolas-martin/dankfolio/gen/go/dankfolio/v1"
// import "google.golang.org/protobuf/types/known/timestamppb"
