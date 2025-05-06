package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres/schema"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Repository implements the generic db.Repository interface using GORM.
type Repository[S schema.Coin | schema.Trade | schema.RawCoin, M model.Coin | model.Trade | schema.RawCoin] struct {
	db *gorm.DB
}

// NewRepository creates a new GORM repository.
func NewRepository[S schema.Coin | schema.Trade | schema.RawCoin, M model.Coin | model.Trade | schema.RawCoin](db *gorm.DB) *Repository[S, M] {
	return &Repository[S, M]{db: db}
}

// Get retrieves an entity by its ID.
func (r *Repository[S, M]) Get(ctx context.Context, id string) (*M, error) {
	var schemaItem S
	pkColumn := "id" // Default for Trade

	switch any(schemaItem).(type) {
	case schema.Coin:
		pkColumn = "mint_address"
	}

	if err := r.db.WithContext(ctx).First(&schemaItem, pkColumn+" = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: item with id %s not found", db.ErrNotFound, id)
		}
		return nil, fmt.Errorf("failed to get item with id %s: %w", id, err)
	}

	modelItem := r.toModel(schemaItem)
	return modelItem.(*M), nil // Type assertion needed here
}

// List retrieves all entities.
func (r *Repository[S, M]) List(ctx context.Context) ([]M, error) {
	var schemaItems []S
	if err := r.db.WithContext(ctx).Find(&schemaItems).Error; err != nil {
		return nil, fmt.Errorf("failed to list items: %w", err)
	}

	modelItems := make([]M, len(schemaItems))
	for i, item := range schemaItems {
		modelItem := r.toModel(item)
		modelItems[i] = *modelItem.(*M) // Type assertion and dereference
	}
	return modelItems, nil
}

// Create inserts a new entity.
func (r *Repository[S, M]) Create(ctx context.Context, item *M) error {
	schemaItem := r.fromModel(*item) // Dereference pointer
	if err := r.db.WithContext(ctx).Create(schemaItem).Error; err != nil {
		return fmt.Errorf("failed to create item: %w", err)
	}
	return nil
}

// Update modifies an existing entity.
func (r *Repository[S, M]) Update(ctx context.Context, item *M) error {
	modelItem := *item // Dereference pointer
	schemaItem := r.fromModel(modelItem)

	// Use Omit to prevent updating primary key
	// Need to get the primary key field name dynamically or assume 'ID'/'MintAddress'
	// For now, assuming primary key field name based on type.
	pkColumn := "id" // Default for Trade

	// Determine the type of M to set the correct primary key name
	switch any(modelItem).(type) {
	case model.Coin:
		pkColumn = "mint_address"
	}

	if err := r.db.WithContext(ctx).Model(schemaItem).Omit(pkColumn).Updates(schemaItem).Error; err != nil {
		return fmt.Errorf("failed to update item: %w", err)
	}
	return nil
}

// Upsert inserts or updates an entity.
func (r *Repository[S, M]) Upsert(ctx context.Context, item *M) error {
	schemaItem := r.fromModel(*item) // Dereference pointer
	// Use Clauses(clause.OnConflict) for upsert
	// Determine the primary key column based on the type for conflict target
	pkColumn := "id" // Default for Trade

	switch any(*item).(type) {
	case model.Coin:
		pkColumn = "mint_address"
	}

	if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: pkColumn}},
		DoUpdates: clause.AssignmentColumns(getColumnNames(schemaItem)), // Update all columns except PK
	}).Create(schemaItem).Error; err != nil {
		return fmt.Errorf("failed to upsert item: %w", err)
	}
	return nil
}

// Delete removes an entity by its ID.
func (r *Repository[S, M]) Delete(ctx context.Context, id string) error {
	// Create an empty instance of S to infer the table name and PK column
	var schemaItem S
	pkColumn := "id" // Default

	switch any(schemaItem).(type) {
	case schema.Coin:
		pkColumn = "mint_address"
	}

	dbResult := r.db.WithContext(ctx).Where(fmt.Sprintf("%s = ?", pkColumn), id).Delete(&schemaItem)
	if dbResult.Error != nil {
		return fmt.Errorf("failed to delete item with id %s: %w", id, dbResult.Error)
	}
	if dbResult.RowsAffected == 0 {
		return fmt.Errorf("%w: item with id %s not found for deletion", db.ErrNotFound, id)
	}
	return nil
}

// --- Mapping Functions ---

// toModel converts a schema type (S) to a model type (M).
// Requires type assertion on the result.
func (r *Repository[S, M]) toModel(s S) interface{} {
	switch v := any(s).(type) {
	case schema.Coin:
		return &model.Coin{
			MintAddress: v.MintAddress,
			Name:        v.Name,
			Symbol:      v.Symbol,
			Decimals:    v.Decimals,
			Description: v.Description,
			IconUrl:     v.IconUrl,
			Tags:        v.Tags,
			Price:       v.Price,
			Change24h:   v.Change24h,
			MarketCap:   v.MarketCap,
			Volume24h:   v.Volume24h,
			Website:     v.Website,
			Twitter:     v.Twitter,
			Telegram:    v.Telegram,
			Discord:     v.Discord,
			IsTrending:  v.IsTrending,
			CreatedAt:   v.CreatedAt.Format(time.RFC3339),
			LastUpdated: v.LastUpdated.Format(time.RFC3339),
		}
	case schema.Trade:
		var completedAt *time.Time
		if v.CompletedAt != nil {
			completedAt = v.CompletedAt
		}
		var errorStr *string
		if v.Error != nil {
			errorStr = v.Error
		}
		var txHash string
		if v.TransactionHash != nil {
			txHash = *v.TransactionHash
		}

		return &model.Trade{
			ID:              v.ID,
			UserID:          v.UserID,
			FromCoinID:      v.FromCoinID,
			ToCoinID:        v.ToCoinID,
			Type:            v.Type,
			Amount:          v.Amount,
			Price:           v.Price,
			Fee:             v.Fee,
			Status:          v.Status,
			TransactionHash: txHash,
			CreatedAt:       v.CreatedAt,
			CompletedAt:     completedAt,
			Confirmations:   v.Confirmations,
			Finalized:       v.Finalized,
			Error:           errorStr,
		}
	case schema.RawCoin:
		return &v // For RawCoin, we just return itself since it's both schema and model
	default:
		panic(fmt.Sprintf("unsupported type for toModel: %T", s))
	}
}

// fromModel converts a model type (M) to a schema type (S).
// Requires type assertion on the result.
func (r *Repository[S, M]) fromModel(m M) interface{} {
	switch v := any(m).(type) {
	case model.Coin:
		return &schema.Coin{
			MintAddress: v.MintAddress,
			Name:        v.Name,
			Symbol:      v.Symbol,
			Decimals:    v.Decimals,
			Description: v.Description,
			IconUrl:     v.IconUrl,
			Tags:        v.Tags,
			Price:       v.Price,
			Change24h:   v.Change24h,
			MarketCap:   v.MarketCap,
			Volume24h:   v.Volume24h,
			Website:     v.Website,
			Twitter:     v.Twitter,
			Telegram:    v.Telegram,
			Discord:     v.Discord,
			IsTrending:  v.IsTrending,
		}
	case model.Trade:
		var txHash *string
		if v.TransactionHash != "" {
			txHash = &v.TransactionHash
		}
		return &schema.Trade{
			ID:              v.ID,
			UserID:          v.UserID,
			FromCoinID:      v.FromCoinID,
			ToCoinID:        v.ToCoinID,
			Type:            v.Type,
			Amount:          v.Amount,
			Price:           v.Price,
			Fee:             v.Fee,
			Status:          v.Status,
			TransactionHash: txHash,
			CreatedAt:       v.CreatedAt,
			CompletedAt:     v.CompletedAt,
			Confirmations:   v.Confirmations,
			Finalized:       v.Finalized,
			Error:           v.Error,
		}
	case schema.RawCoin:
		return &v // For RawCoin, we just return itself since it's both schema and model
	default:
		panic(fmt.Sprintf("unsupported type for fromModel: %T", m))
	}
}

// Helper to get column names for OnConflict update
// Note: This is a basic implementation; a more robust version might use reflection
// or struct tags to exclude primary keys, created_at, etc.
func getColumnNames(data interface{}) []string {
	switch data.(type) {
	case *schema.Coin:
		// Explicitly list columns to update, excluding primary key and created_at
		return []string{"name", "symbol", "decimals", "description", "icon_url", "tags", "price", "change_24h", "market_cap", "volume_24h", "website", "twitter", "telegram", "discord", "is_trending", "last_updated"}
	case *schema.Trade:
		return []string{"user_id", "from_coin_id", "to_coin_id", "type", "amount", "price", "fee", "status", "transaction_hash", "completed_at", "confirmations", "finalized", "error"}
	case *schema.RawCoin:
		return []string{"mint_address", "symbol", "name", "decimals", "logo_url", "updated_at"}
	default:
		return []string{} // Should not happen with current generic constraints
	}
}
