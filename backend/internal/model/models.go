package model

const (
	SolMint = "So11111111111111111111111111111111111111112"
)

// Coin represents a cryptocurrency coin with all its metadata
type Coin struct {
	// Basic Info (from all sources)
	ID          string   `json:"id"` // Same as Address/Mint
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Decimals    int      `json:"decimals"`
	Description string   `json:"description"`
	IconUrl     string   `json:"icon_url"`
	Tags        []string `json:"tags,omitempty"`

	// Price and Market Data
	Price       float64 `json:"price"`
	Change24h   float64 `json:"change_24h,omitempty"`
	MarketCap   float64 `json:"market_cap,omitempty"`
	DailyVolume float64 `json:"daily_volume,omitempty"`

	// Social and External Links
	Website  string `json:"website,omitempty"`
	Twitter  string `json:"twitter,omitempty"`
	Telegram string `json:"telegram,omitempty"`
	Discord  string `json:"discord,omitempty"`

	// Metadata
	CreatedAt   string `json:"created_at,omitempty"`
	LastUpdated string `json:"last_updated,omitempty"`

	// Internal state flag
	IsTrending bool `json:"-"` // Flag indicating if loaded from trending file, excluded from JSON
}

// GetID implements the Entity interface
func (c Coin) GetID() string {
	return c.ID
}

// Trade represents a cryptocurrency trade
type Trade struct {
	ID                string  `json:"id"`
	CoinID            string  `json:"coin_id"`
	Amount            float64 `json:"amount"`
	Price             float64 `json:"price"`
	Timestamp         int64   `json:"timestamp"`
	SignedTransaction string  `json:"signed_transaction"` // Base64 encoded signed transaction
	Status            string  `json:"status"`             // Status of the trade (e.g., "submitted", "confirmed", "failed")
	TransactionHash   string  `json:"transaction_hash"`   // Solana transaction signature/hash
}

// GetID implements the Entity interface
func (t Trade) GetID() string {
	return t.ID
}
