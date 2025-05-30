package schema

import (
	"time"

	"github.com/lib/pq"
)

type Wallet struct {
	ID        string    `gorm:"primaryKey;column:id"`
	PublicKey string    `gorm:"column:public_key;not null;unique"`
	CreatedAt time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
}

func (w Wallet) GetID() string {
	return w.ID
}

// Coin represents the structure of the 'coins' table in the database.
type Coin struct {
	ID          uint64         `gorm:"primaryKey;autoIncrement;not null"`
	MintAddress string         `gorm:"column:mint_address;not null;uniqueIndex:idx_coins_mint_address"`
	Name        string         `gorm:"column:name;not null"`
	Symbol      string         `gorm:"column:symbol;not null;index:idx_coins_symbol"`
	Decimals    int            `gorm:"column:decimals;not null"`
	Description string         `gorm:"column:description"`
	IconUrl     string         `gorm:"column:icon_url"`
	Tags        pq.StringArray `gorm:"column:tags;type:text[];index:idx_coins_tags,type:gin"`
	Price       float64        `gorm:"column:price;default:0.0"`
	Change24h   float64        `gorm:"column:change_24h;default:0.0"`
	MarketCap   float64        `gorm:"column:market_cap;default:0.0"`
	Volume24h   float64        `gorm:"column:volume_24h;default:0.0"`
	Website     string         `gorm:"column:website"`
	Twitter     string         `gorm:"column:twitter"`
	Telegram    string         `gorm:"column:telegram"`
	Discord     string         `gorm:"column:discord"`
	IsTrending  bool           `gorm:"column:is_trending;default:false"`
	CreatedAt   time.Time      `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
	LastUpdated time.Time      `gorm:"column:last_updated;default:CURRENT_TIMESTAMP"`
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

// RawCoin represents the structure of the 'raw_coins' table for raw Jupiter tokens.
type RawCoin struct {
	ID          uint64     `gorm:"primaryKey;autoIncrement;not null"`
	MintAddress string     `gorm:"column:mint_address;not null;uniqueIndex:idx_raw_coins_mint_address"`
	Symbol      string     `gorm:"column:symbol;not null"`
	Name        string     `gorm:"column:name;not null"`
	Decimals    int        `gorm:"column:decimals;not null"`
	LogoUrl     string     `gorm:"column:logo_url"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;default:CURRENT_TIMESTAMP"`
	JupiterCreatedAt *time.Time `gorm:"column:jupiter_created_at;index"`
}

// TableName overrides the default table name generation for RawCoin.
func (RawCoin) TableName() string {
	return "raw_coins"
}

// GetID returns the primary key field name for RawCoin
func (r RawCoin) GetID() string {
	return "id"
}

// Trade represents the structure of the 'trades' table in the database.
type Trade struct {
	ID                  string     `gorm:"primaryKey;column:id"`
	UserID              string     `gorm:"column:user_id;not null;index:idx_trades_user_id"`
	FromCoinMintAddress string     `gorm:"column:from_coin_mint_address;type:text;index:idx_trades_from_mint"`
	FromCoinPKID        uint64     `gorm:"column:from_coin_pk_id;index:idx_trades_from_coin_pk_id"`
	ToCoinMintAddress   string     `gorm:"column:to_coin_mint_address;type:text;index:idx_trades_to_mint"`
	ToCoinPKID          uint64     `gorm:"column:to_coin_pk_id;index:idx_trades_to_coin_pk_id"`
	Type                string     `gorm:"column:type;not null"` // e.g., "buy", "sell", "swap"
	Amount              float64    `gorm:"column:amount;not null"` // Amount of 'FromCoin' for sells/swaps, 'ToCoin' for buys
	Price               float64    `gorm:"column:price;not null"`  // Price per unit of 'ToCoin' in terms of 'FromCoin' or quote currency
	Fee                 float64    `gorm:"column:fee;default:0.0"` // Fee amount in quote currency or native token
	Status              string     `gorm:"column:status;not null;index:idx_trades_status"` // e.g., "pending", "completed", "failed"
	TransactionHash     *string    `gorm:"column:transaction_hash;unique"`
	UnsignedTransaction *string    `gorm:"column:unsigned_transaction"` // For Solana, this could be base64 encoded transaction
	CreatedAt           time.Time  `gorm:"column:created_at;default:CURRENT_TIMESTAMP;index:idx_trades_created_at"`
	CompletedAt         *time.Time `gorm:"column:completed_at"`
	Confirmations       int32      `gorm:"column:confirmations;default:0"`
	Finalized           bool       `gorm:"column:finalized;default:false"`
	Error               *string    `gorm:"column:error"`
}

// GetID returns the primary key column name for Trade
func (t Trade) GetID() string {
	return "id" // This remains the string UUID for Trade's own PK
}

// TableName overrides the default table name generation.
func (Trade) TableName() string {
	return "trades"
}
