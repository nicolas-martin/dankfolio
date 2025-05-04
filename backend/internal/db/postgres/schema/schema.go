package schema

import (
	"time"

	"github.com/lib/pq"
)

// Coin represents the structure of the 'coins' table in the database.
type Coin struct {
	MintAddress string         `gorm:"primaryKey;column:mint_address"`
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

// Trade represents the structure of the 'trades' table in the database.
type Trade struct {
	ID              string     `gorm:"primaryKey;column:id"`
	UserID          string     `gorm:"column:user_id;not null;index:idx_trades_user_id"`
	FromCoinID      string     `gorm:"column:from_coin_id;not null;index:idx_trades_from_coin_id"`
	ToCoinID        string     `gorm:"column:to_coin_id;not null;index:idx_trades_to_coin_id"`
	Type            string     `gorm:"column:type;not null"`
	Amount          float64    `gorm:"column:amount;not null"`
	Price           float64    `gorm:"column:price;not null"`
	Fee             float64    `gorm:"column:fee;default:0.0"`
	Status          string     `gorm:"column:status;not null;index:idx_trades_status"`
	TransactionHash *string    `gorm:"column:transaction_hash;unique"` // Use pointer for nullability
	CreatedAt       time.Time  `gorm:"column:created_at;default:CURRENT_TIMESTAMP;index:idx_trades_created_at"`
	CompletedAt     *time.Time `gorm:"column:completed_at"`
	Confirmations   int32      `gorm:"column:confirmations;default:0"`
	Finalized       bool       `gorm:"column:finalized;default:false"`
	Error           *string    `gorm:"column:error"`

	// Define relationships (optional but good practice)
	FromCoin Coin `gorm:"foreignKey:FromCoinID"`
	ToCoin   Coin `gorm:"foreignKey:ToCoinID"`
}

// TableName overrides the default table name generation.
func (Trade) TableName() string {
	return "trades"
}
