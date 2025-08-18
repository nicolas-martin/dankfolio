package schema

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type Wallet struct {
	ID        string         `gorm:"primaryKey;column:id"`
	PublicKey string         `gorm:"column:public_key;not null;unique"`
	CreatedAt time.Time      `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (w Wallet) GetID() string {
	return w.ID
}

// Coin represents the structure of the 'coins' table in the database.
// Field names aligned with BirdEye API for consistency
type Coin struct {
	ID                     uint64         `gorm:"primaryKey;autoIncrement;not null"`
	Address                string         `gorm:"column:address;not null;uniqueIndex:idx_coins_address"`
	Name                   string         `gorm:"column:name;not null"`
	Symbol                 string         `gorm:"column:symbol;not null;index:idx_coins_symbol"`
	Decimals               int            `gorm:"column:decimals;not null"`
	Description            string         `gorm:"column:description"`
	LogoURI                string         `gorm:"column:logo_uri"`
	Tags                   pq.StringArray `gorm:"column:tags;type:text[];index:idx_coins_tags,type:gin"`
	Price                  float64        `gorm:"column:price;default:0.0"`
	Price24hChangePercent  float64        `gorm:"column:price_24h_change_percent;default:0.0;index:idx_coins_price_change_desc"`
	Marketcap              float64        `gorm:"column:marketcap;default:0.0;index:idx_coins_marketcap_desc"`
	Volume24hUSD           float64        `gorm:"column:volume_24h_usd;default:0.0;index:idx_coins_volume_desc"`
	Volume24hChangePercent float64        `gorm:"column:volume_24h_change_percent;default:0.0"`
	Liquidity              float64        `gorm:"column:liquidity;default:0.0"`
	FDV                    float64        `gorm:"column:fdv;default:0.0"`
	Rank                   int            `gorm:"column:rank;default:0"`
	Website                string         `gorm:"column:website"`
	Twitter                string         `gorm:"column:twitter"`
	Telegram               string         `gorm:"column:telegram"`
	Discord                string         `gorm:"column:discord"`
	CreatedAt              time.Time      `gorm:"column:created_at;default:CURRENT_TIMESTAMP;index:idx_coins_created_at_desc"`
	LastUpdated            time.Time      `gorm:"column:last_updated;default:CURRENT_TIMESTAMP"`
	JupiterCreatedAt       *time.Time     `gorm:"column:jupiter_created_at;index"`
}

// TableName overrides the default table name generation.
func (Coin) TableName() string {
	return "coins"
}

// GetID returns the primary key column name for Coin
func (c Coin) GetID() string {
	// This should return the column name that the generic Repository expects for Get/Delete by ID.
	// Since we're introducing an auto-incrementing 'ID' as the primary key,
	// operations like Get(id) should use this numeric ID.
	// However, our model.Coin still uses MintAddress for identification in service logic.
	// For GORM's primary key identification, it will use the `gorm:"primaryKey"` tag.
	// The GetID method in the Entity interface is more about how the *application* identifies unique entities
	// for the generic repository's Get/Delete methods if they were to take a string ID that wasn't necessarily the PK.
	// Given the repository uses `Get(ctx context.Context, id string)`, this implies string IDs.
	// If the intent is for `GetID()` to refer to the `MintAddress` for service-level identification,
	// but GORM uses `ID` for DB PK, there might be a mismatch or a need for specific query methods.
	// For now, aligning GetID with the new PK `ID` seems consistent if repository methods are to use it.
	// But the problem states to return "id", implying the *field name* not the *column name*.
	// The previous implementation returned "mint_address" (column name).
	// Let's assume it means the field name that acts as the unique identifier for the GetID() contract.
	// If `GetID()` is used by `Repository.Get(id string)` and `id` is expected to be `MintAddress` string,
	// then `GetID()` should return `MintAddress`. But if `id` is expected to be the new PK, it's different.
	// The subtask says "Update the GetID() method to return "id"". This likely refers to the new PK field name.
	return "id"
}

// Trade represents the structure of the 'trades' table in the database.
type Trade struct {
	ID                  uint    `gorm:"primaryKey;autoIncrement;column:id"`
	UserID              string  `gorm:"column:user_id;not null;index:idx_trades_user_id"`
	FromCoinMintAddress string  `gorm:"column:from_coin_mint_address;type:text;index:idx_trades_from_mint"`
	FromCoinPKID        uint64  `gorm:"column:from_coin_pk_id;index:idx_trades_from_coin_pk_id"`
	ToCoinMintAddress   string  `gorm:"column:to_coin_mint_address;type:text;index:idx_trades_to_mint"`
	ToCoinPKID          uint64  `gorm:"column:to_coin_pk_id;index:idx_trades_to_coin_pk_id"`
	CoinSymbol          string  `gorm:"column:coin_symbol"`     // Primary coin symbol for display
	Type                string  `gorm:"column:type;not null"`   // e.g., "buy", "sell", "swap"
	Amount              float64 `gorm:"column:amount;not null"` // Amount of 'FromCoin' for sells/swaps, 'ToCoin' for buys
	OutputAmount        float64 `gorm:"column:output_amount;default:0.0"` // Amount of 'ToCoin' received in swaps

	// Fee Information
	Fee            float64 `gorm:"column:fee;default:0.0"`              // Total fee in USD
	TotalFeeAmount float64 `gorm:"column:total_fee_amount;default:0.0"` // Total fee amount in native units
	TotalFeeMint   string  `gorm:"column:total_fee_mint"`               // Mint address of the token used for total fees

	// Platform Fee Information
	PlatformFeeAmount      float64 `gorm:"column:platform_fee_amount;default:0.0"` // Platform fee amount in native units
	PlatformFeeBps         int     `gorm:"column:platform_fee_bps;default:0"`
	PlatformFeeMint        string  `gorm:"column:platform_fee_mint"`        // Mint address of the token used for platform fees
	PlatformFeeDestination string  `gorm:"column:platform_fee_destination"` // Account receiving platform fees

	// Route Fee Information (from Jupiter route plan)
	RouteFeeAmount  float64        `gorm:"column:route_fee_amount;default:0.0"` // Total route fees in native units
	RouteFeeMints   pq.StringArray `gorm:"column:route_fee_mints;type:text[]"`  // List of mints used for route fees
	RouteFeeDetails string         `gorm:"column:route_fee_details;type:text"`  // JSON string of detailed route fee breakdown

	// Price Impact
	PriceImpactPercent float64 `gorm:"column:price_impact_percent;default:0.0"` // Price impact as percentage
	
	// USD Values at Time of Trade (for accurate PnL calculation)
	FromUSDPrice float64 `gorm:"column:from_usd_price;default:0.0"` // USD price of FROM token at trade time
	ToUSDPrice   float64 `gorm:"column:to_usd_price;default:0.0"`   // USD price of TO token at trade time
	TotalUSDCost float64 `gorm:"column:total_usd_cost;default:0.0"` // Total USD cost of the trade

	Status              string    `gorm:"column:status;not null;index:idx_trades_status"` // e.g., "pending", "completed", "failed"
	TransactionHash     string    `gorm:"column:transaction_hash"`
	UnsignedTransaction string    `gorm:"column:unsigned_transaction;index:idx_trades_unsigned_tx"` // For Solana, this could be base64 encoded transaction
	CreatedAt           time.Time      `gorm:"column:created_at;default:CURRENT_TIMESTAMP;index:idx_trades_created_at"`
	CompletedAt         time.Time      `gorm:"column:completed_at"`
	Confirmations       int32          `gorm:"column:confirmations;default:0"`
	Finalized           bool           `gorm:"column:finalized;default:false"`
	Error               string         `gorm:"column:error"`
	DeletedAt           gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

// GetID returns the primary key column name for Trade
func (t Trade) GetID() string {
	return "id" // This remains the string UUID for Trade's own PK
}

// TableName overrides the default table name generation.
func (Trade) TableName() string {
	return "trades"
}

// NaughtyWord represents a word that should be filtered.
type NaughtyWord struct {
	Word     string `gorm:"primaryKey;type:varchar(255);column:word"`
	Language string `gorm:"column:language;type:varchar(10);default:'en';index:idx_naughty_words_language"`
}

// TableName overrides the default table name generation for NaughtyWord.
func (NaughtyWord) TableName() string {
	return "naughty_words"
}

// GetID returns the primary key field for NaughtyWord.
// For consistency with other models, though it's just the word itself.
func (n NaughtyWord) GetID() string {
	return n.Word
}
