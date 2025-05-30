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
type Repository[S interface {
	schema.Coin | schema.Trade | schema.RawCoin | schema.Wallet
	db.Entity
}, M model.Coin | model.Trade | model.RawCoin | model.Wallet] struct {
	db *gorm.DB
}

// NewRepository creates a new GORM repository.
func NewRepository[S interface {
	schema.Coin | schema.Trade | schema.RawCoin | schema.Wallet
	db.Entity
}, M model.Coin | model.Trade | model.RawCoin | model.Wallet](db *gorm.DB) *Repository[S, M] {
	return &Repository[S, M]{db: db}
}

// Get retrieves an entity by its ID.
func (r *Repository[S, M]) Get(ctx context.Context, id string) (*M, error) {
	var schemaItem S
	if err := r.db.WithContext(ctx).First(&schemaItem, fmt.Sprintf("%s = ?", schemaItem.GetID()), id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: item with id %s not found", db.ErrNotFound, id)
		}
		return nil, fmt.Errorf("failed to get item with id %s: %w", id, err)
	}

	modelItem := r.toModel(schemaItem)
	return modelItem.(*M), nil
}

// GetByField retrieves an entity by a specific field value.
func (r *Repository[S, M]) GetByField(ctx context.Context, field string, value any) (*M, error) {
	var schemaItem S
	if err := r.db.WithContext(ctx).Where(field+" = ?", value).First(&schemaItem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: item with %s = %v not found", db.ErrNotFound, field, value)
		}
		return nil, fmt.Errorf("failed to get item by %s = %v: %w", field, value, err)
	}

	modelItem := r.toModel(schemaItem)
	return modelItem.(*M), nil
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
	modelItem := *item
	schemaItem := r.fromModel(modelItem)

	if err := r.db.WithContext(ctx).Model(schemaItem).
		Select(getColumnNames(schemaItem)).
		Updates(schemaItem).Error; err != nil {
		return fmt.Errorf("failed to update item: %w", err)
	}
	return nil
}

// Upsert inserts or updates an entity.
func (r *Repository[S, M]) Upsert(ctx context.Context, item *M) (int64, error) {
	schemaItem := r.fromModel(*item)
	var s S // Create zero value of S to get the column name
	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: s.GetID()}},
		DoUpdates: clause.AssignmentColumns(getColumnNames(schemaItem)),
	}).Create(schemaItem)
	if result.Error != nil {
		return 0, fmt.Errorf("failed to upsert item: %w", result.Error)
	}
	return result.RowsAffected, nil
}

// Delete removes an entity by its ID.
func (r *Repository[S, M]) Delete(ctx context.Context, id string) error {
	var schemaItem S
	dbResult := r.db.WithContext(ctx).Where(fmt.Sprintf("%s = ?", schemaItem.GetID()), id).Delete(&schemaItem)
	if dbResult.Error != nil {
		return fmt.Errorf("failed to delete item with id %s: %w", id, dbResult.Error)
	}
	if dbResult.RowsAffected == 0 {
		return fmt.Errorf("%w: item with id %s not found for deletion", db.ErrNotFound, id)
	}
	return nil
}

// BulkUpsert inserts or updates multiple entities in batches.
func (r *Repository[S, M]) BulkUpsert(ctx context.Context, items *[]M) (int64, error) {
	if items == nil || len(*items) == 0 {
		return 0, nil // Nothing to do
	}

	// The schemaItems slice should hold actual schema type instances, not pointers,
	// as CreateInBatches expects a slice of structs.
	schemaItems := make([]S, len(*items))
	for i, modelItem := range *items {
		// r.fromModel returns an interface (any) that holds a pointer to a schema object (e.g., *schema.Coin).
		// We need to dereference this pointer to store the actual schema object in the slice.
		schemaItemPtr := r.fromModel(modelItem).(*S) // Assert to *S, which is the type like *schema.Coin
		schemaItems[i] = *schemaItemPtr             // Dereference to get S, like schema.Coin
	}

	// Need a zero value of S to get column names and ID field name for the conflict clause.
	// This works because GetID() and getColumnNames() are designed to work with S or *S.
	var s S
	batchSize := len(schemaItems) // Process all items in a single batch as per GORM examples for full slice upsert.

	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: s.GetID()}},
		DoUpdates: clause.AssignmentColumns(getColumnNames(&s)), // getColumnNames expects a pointer
	}).CreateInBatches(schemaItems, batchSize)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to bulk upsert items: %w", result.Error)
	}

	return result.RowsAffected, nil
}

// ListWithOpts retrieves a paginated, sorted, and filtered list of entities.
func (r *Repository[S, M]) ListWithOpts(ctx context.Context, opts db.ListOptions) ([]M, int64, error) {
	var schemaItems []S
	var total int64

	// Base query for the specific schema type S
	query := r.db.WithContext(ctx).Model(new(S))

	// Apply filters for counting
	countQuery := query
	for _, filter := range opts.Filters {
		op := filter.Operator
		if op == "" {
			op = db.FilterOpEqual
		}
		countQuery = countQuery.Where(fmt.Sprintf("%s %s ?", filter.Field, string(op)), filter.Value)
	}
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count items: %w", err)
	}

	// Apply filters, sorting, pagination for fetching items
	itemQuery := query
	for _, filter := range opts.Filters {
		op := filter.Operator
		if op == "" {
			op = db.FilterOpEqual
		}
		itemQuery = itemQuery.Where(fmt.Sprintf("%s %s ?", filter.Field, string(op)), filter.Value)
	}

	if opts.SortBy != nil && *opts.SortBy != "" {
		orderStr := *opts.SortBy
		if opts.SortDesc != nil && *opts.SortDesc {
			orderStr += " DESC"
		} else {
			orderStr += " ASC"
		}
		itemQuery = itemQuery.Order(orderStr)
	}

	if opts.Limit != nil && *opts.Limit > 0 {
		itemQuery = itemQuery.Limit(*opts.Limit)
	}
	if opts.Offset != nil && *opts.Offset >= 0 {
		itemQuery = itemQuery.Offset(*opts.Offset)
	}

	if err := itemQuery.Find(&schemaItems).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list items with options: %w", err)
	}

	modelItems := make([]M, len(schemaItems))
	for i, item := range schemaItems {
		modelItem := r.toModel(item)
		modelItems[i] = *modelItem.(*M)
	}

	return modelItems, total, nil
}


// --- Mapping Functions ---

// toModel converts a schema type (S) to a model type (M).
// Requires type assertion on the result.
func (r *Repository[S, M]) toModel(s S) any {
	switch v := any(s).(type) {
	case schema.Coin:
		return &model.Coin{
			ID:          v.ID, // Added
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
		var unsignedTx string
		if v.UnsignedTransaction != nil {
			unsignedTx = *v.UnsignedTransaction
		}

		return &model.Trade{
			ID:                  v.ID,
			UserID:              v.UserID,
			FromCoinMintAddress: v.FromCoinMintAddress, // Changed
			FromCoinPKID:        v.FromCoinPKID,        // Added
			ToCoinMintAddress:   v.ToCoinMintAddress,   // Changed
			ToCoinPKID:          v.ToCoinPKID,          // Added
			Type:                v.Type,
			Amount:              v.Amount,
			Price:               v.Price,
			Fee:                 v.Fee,
			Status:              v.Status,
			TransactionHash:     txHash,
			UnsignedTransaction: unsignedTx,
			CreatedAt:           v.CreatedAt,
			CompletedAt:         completedAt,
			Confirmations:       v.Confirmations,
			Finalized:           v.Finalized,
			Error:               errorStr,
		}
	case schema.RawCoin:
		return &model.RawCoin{
			ID:          v.ID, // Added
			MintAddress: v.MintAddress,
			Symbol:      v.Symbol,
			Name:        v.Name,
			Decimals:    v.Decimals,
			LogoUrl:     v.LogoUrl,
			UpdatedAt:   v.UpdatedAt.Format(time.RFC3339),
		}
	case schema.Wallet:
		return &model.Wallet{
			ID:        v.ID,
			PublicKey: v.PublicKey,
			CreatedAt: v.CreatedAt,
		}
	default:
		panic(fmt.Sprintf("unsupported type for toModel: %T", s))
	}
}

// fromModel converts a model type (M) to a schema type (S).
// Requires type assertion on the result.
func (r *Repository[S, M]) fromModel(m M) any {
	switch v := any(m).(type) {
	case model.Coin:
		sCoin := &schema.Coin{
			// ID is not set here if v.ID is 0 (new record), GORM handles auto-increment
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
			LastUpdated: time.Now(),
		}
		if v.ID != 0 {
			sCoin.ID = v.ID
		}
		return sCoin
	case model.Trade:
		var txHash *string
		if v.TransactionHash != "" {
			txHash = &v.TransactionHash
		}
		var unsignedTx *string
		if v.UnsignedTransaction != "" {
			unsignedTx = &v.UnsignedTransaction
		}
		return &schema.Trade{
			ID:                  v.ID,
			UserID:              v.UserID,
			FromCoinMintAddress: v.FromCoinMintAddress, // Changed
			FromCoinPKID:        v.FromCoinPKID,        // Added
			ToCoinMintAddress:   v.ToCoinMintAddress,   // Changed
			ToCoinPKID:          v.ToCoinPKID,          // Added
			Type:                v.Type,
			Amount:              v.Amount,
			Price:               v.Price,
			Fee:                 v.Fee,
			Status:              v.Status,
			TransactionHash:     txHash,
			UnsignedTransaction: unsignedTx,
			CreatedAt:           v.CreatedAt,
			CompletedAt:         v.CompletedAt,
			Confirmations:       v.Confirmations,
			Finalized:           v.Finalized,
			Error:               v.Error,
		}
	case model.RawCoin:
		updatedAt, _ := time.Parse(time.RFC3339, v.UpdatedAt) // v.UpdatedAt is string
		// schema.RawCoin.UpdatedAt is time.Time

		// Directly assign JupiterCreatedAt as it's already *time.Time in model.RawCoin
		// and schema.RawCoin expects *time.Time for its JupiterCreatedAt field.
		sRawCoin := &schema.RawCoin{
			// ID is not set here if v.ID is 0 (new record)
			MintAddress:      v.MintAddress,
			Symbol:           v.Symbol,
			Name:             v.Name,
			Decimals:         v.Decimals,
			LogoUrl:          v.LogoUrl,
			UpdatedAt:        updatedAt, // Parsed from model's string UpdatedAt
			JupiterCreatedAt: v.JupiterCreatedAt, // Assign *time.Time directly
		}
		if v.ID != 0 {
			sRawCoin.ID = v.ID
		}
		return sRawCoin
	case model.Wallet:
		return &schema.Wallet{
			ID:        v.ID,
			PublicKey: v.PublicKey,
			CreatedAt: v.CreatedAt,
		}
	default:
		panic(fmt.Sprintf("unsupported type for fromModel: %T", m))
	}
}

// Helper to get column names for OnConflict update
// Note: This is a basic implementation; a more robust version might use reflection
// or struct tags to exclude primary keys, created_at, etc.
func getColumnNames(data any) []string {
	switch data.(type) {
	case *schema.Coin:
		// Explicitly list columns to update, excluding PK 'id' and 'created_at'
		return []string{
			"mint_address", "name", "symbol", "decimals", "description", "icon_url", "tags",
			"price", "change_24h", "market_cap", "volume_24h", "website",
			"twitter", "telegram", "discord", "is_trending", "last_updated",
		}
	case *schema.Trade:
		// Explicitly list columns to update, excluding PK 'id'
		return []string{
			"user_id", "from_coin_mint_address", "from_coin_pk_id", "to_coin_mint_address", "to_coin_pk_id",
			"type", "amount", "price", "fee", "status", "transaction_hash", "unsigned_transaction",
			"completed_at", "confirmations", "finalized", "error", // CreatedAt is usually set on create
		}
	case *schema.RawCoin:
		// Explicitly list columns to update, excluding PK 'id'
		return []string{"mint_address", "symbol", "name", "decimals", "logo_url", "updated_at", "jupiter_created_at"}
	case *schema.Wallet:
		// Explicitly list columns to update, excluding PK 'id'
		return []string{"public_key"} // CreatedAt is usually set on create
	default:
		return []string{} // Should not happen with current generic constraints
	}
}
