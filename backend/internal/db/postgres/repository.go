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
// S is the schema type (used with GORM), M is the model type (used in services).
// For ApiStat, S and M might be the same (model.ApiStat).
type Repository[S interface {
	schema.Coin | schema.Trade | schema.RawCoin | schema.Wallet | model.ApiStat // Added model.ApiStat for S
	db.Entity
}, M interface {
	model.Coin | model.Trade | model.RawCoin | model.Wallet | model.ApiStat // Added model.ApiStat for M
}] struct {
	db *gorm.DB
}

// NewRepository creates a new GORM repository.
func NewRepository[S interface {
	schema.Coin | schema.Trade | schema.RawCoin | schema.Wallet | model.ApiStat
	db.Entity
}, M interface {
	model.Coin | model.Trade | model.RawCoin | model.Wallet | model.ApiStat
}](db *gorm.DB) *Repository[S, M] {
	return &Repository[S, M]{db: db}
}

// Get retrieves an entity by its ID.
func (r *Repository[S, M]) Get(ctx context.Context, id string) (*M, error) {
	var schemaItem S
	// Default to "id" as primary key column name.
	// Specific types like schema.Coin might override GetID() to return a different value
	// if their PK is not 'id', but the query here assumes the column is named 'id' if GetID() from zero value is not reliable.
	// For ApiStat (uint ID), schemaItem.GetID() on zero value would be "0".
	// For string ID types (like Trade), schemaItem.GetID() on zero value would be "".
	// Hardcoding "id = ?" is safer for types with standard "id" PK.
	// This assumes that `id` parameter passed to Get is always for a column named "id".
	// If a type S has a PK column named differently (e.g. "uuid"), this generic Get will fail for it.
	// The original `fmt.Sprintf("%s = ?", schemaItem.GetID())` was problematic if GetID() returned the value of ID field from zero struct.
	if err := r.db.WithContext(ctx).First(&schemaItem, "id = ?", id).Error; err != nil {
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
// It now uses ListWithOpts internally, passing through the options.
// If no specific filters are needed for a simple List call, opts can be empty or have only pagination/sorting.
func (r *Repository[S, M]) List(ctx context.Context, opts db.ListOptions) ([]M, int32, error) {
	// This effectively makes List an alias for ListWithOpts.
	// If List was intended to have some default filters that ListWithOpts doesn't,
	// those would be applied here before calling ListWithOpts.
	// For now, assume List is just a paginated/sorted version of "get all" (with optional filters in opts).
	return r.ListWithOpts(ctx, opts)
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
	schemaItem := r.fromModel(*item) // schemaItem is *S, e.g. *schema.Coin or *model.ApiStat
	var s S                          // Zero value of S, e.g. schema.Coin or model.ApiStat

	var conflictColumns []clause.Column
	var updateColumns []string

	// Determine conflict columns and update columns based on the type of S
	// This uses type assertion on a pointer to the zero value of S (*sPtr) because getColumnNames expects a pointer.
	// And for type switching, using the zero value `s` itself is fine.
	sPtr := new(S) // Pointer to zero value of S, for getColumnNames if schemaItem was nil (not the case here)
	_ = sPtr       // Avoid unused variable error if not directly used in switch, using schemaItem instead for getColumnNames

	switch any(s).(type) {
	case model.ApiStat:
		// For ApiStat, conflict is on (service_name, endpoint_name, date)
		// GORM tags on model.ApiStat define `uniqueIndex:idx_service_endpoint_date`
		// We can specify the constraint name or the columns.
		// It's safer to specify columns if the auto-generated name is not predictable,
		// or use GORM's built-in unique index handling if `Model(&model.ApiStat{})` is used before Clauses.
		// However, here we're in a generic repo.
		conflictColumns = []clause.Column{
			{Name: "service_name"},
			{Name: "endpoint_name"},
			{Name: "date"},
		}
		// getColumnNames for *model.ApiStat returns {"count"}
		updateColumns = getColumnNames(schemaItem) // schemaItem is *model.ApiStat here
	default:
		// Default behavior for other types. Assumes PK column name is "id".
		// This is a simplification. If other types have different PK names (e.g. "uuid", "mint_address for Coin"),
		// this default case needs to be smarter or those types need specific cases.
		// schema.Coin and schema.RawCoin have mint_address as their unique ID for upsert logic.
		// schema.Trade and schema.Wallet have string ID.
		// model.ApiStat has uint ID, auto-increment.
		// The GetID() method on the *instance* provides the value for the PK.
		// The conflict target should be the actual column name.
		// For types like Coin/RawCoin, their PK for conflict is mint_address, not 'id'.
		// For Trade/Wallet, their PK is 'id'.
		// This default case is now specifically for types where the PK column is 'id'.
		// This means Coin/RawCoin would need their own case here if their PK for conflict is not 'id'
		// and they are to be Upserted via this generic method using PK conflict.
		// However, Coin/RawCoin have specific BulkUpsert logic using mint_address.
		// For single Upsert, if they use 'id' as PK in DB table, this is fine.
		conflictColumns = []clause.Column{{Name: "id"}} // Default to "id" for PK conflict
		updateColumns = getColumnNames(schemaItem)      // Get all relevant columns for update
	}

	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   conflictColumns,
		DoUpdates: clause.AssignmentColumns(updateColumns),
	}).Create(schemaItem)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to upsert item: %w", result.Error)
	}
	return result.RowsAffected, nil
}

// Delete removes an entity by its ID.
func (r *Repository[S, M]) Delete(ctx context.Context, id string) error {
	var schemaItem S
	// Similar to Get, this assumes the primary key column is named "id".
	// This might not hold for all types (e.g., schema.Coin uses mint_address as its logical ID).
	// If the GORM model `S` has a correctly tagged PK field (e.g. `gorm:"primaryKey"`),
	// GORM's Delete might work correctly even with just `&schemaItem` and Where("id = ?", id).
	// However, explicit is often better.
	dbResult := r.db.WithContext(ctx).Where("id = ?", id).Delete(&schemaItem)
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
		schemaItems[i] = *schemaItemPtr              // Dereference to get S, like schema.Coin
	}

	// Need a zero value of S to get column names and ID field name for the conflict clause.
	// This works because GetID() and getColumnNames() are designed to work with S or *S.
	var s S
	var conflictColumns []clause.Column

	switch any(s).(type) {
	case schema.Coin:
		conflictColumns = []clause.Column{{Name: "mint_address"}}
	case schema.RawCoin:
		conflictColumns = []clause.Column{{Name: "mint_address"}}
	// model.ApiStat is not expected in BulkUpsert with PK conflict, it has its own unique index.
	// If it were, its PK is 'id'.
	default:
		// Defaulting to "id" for other types like Trade, Wallet.
		// This assumes their primary key for conflict purposes is 'id'.
		conflictColumns = []clause.Column{{Name: "id"}}
	}

	batchSize := len(schemaItems) // Process all items in a single batch as per GORM examples for full slice upsert.

	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   conflictColumns,
		DoUpdates: clause.AssignmentColumns(getColumnNames(&s)), // getColumnNames expects a pointer
	}).CreateInBatches(schemaItems, batchSize)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to bulk upsert items: %w", result.Error)
	}

	return result.RowsAffected, nil
}

// ListWithOpts retrieves a paginated, sorted, and filtered list of entities.
func (r *Repository[S, M]) ListWithOpts(ctx context.Context, opts db.ListOptions) ([]M, int32, error) {
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

	return modelItems, int32(total), nil
}

// --- Mapping Functions ---

// toModel converts a schema type (S) to a model type (M).
// Requires type assertion on the result.
func (r *Repository[S, M]) toModel(s S) any {
	switch v := any(s).(type) {
	case schema.Coin:
		return &model.Coin{
			ID:              v.ID, // Added
			MintAddress:     v.MintAddress,
			Name:            v.Name,
			Symbol:          v.Symbol,
			Decimals:        v.Decimals,
			Description:     v.Description,
			IconUrl:         v.IconUrl,
			ResolvedIconUrl: v.ResolvedIconUrl,
			Tags:            v.Tags,
			Price:           v.Price,
			Change24h:       v.Change24h,
			MarketCap:       v.MarketCap,
			Volume24h:       v.Volume24h,
			Website:         v.Website,
			Twitter:         v.Twitter,
			Telegram:        v.Telegram,
			Discord:         v.Discord,
			IsTrending:      v.IsTrending,
			CreatedAt:       v.CreatedAt.Format(time.RFC3339),
			LastUpdated:     v.LastUpdated.Format(time.RFC3339),
			JupiterListedAt: v.JupiterCreatedAt, // Map JupiterCreatedAt to JupiterListedAt
		}
	case schema.Trade:
		return &model.Trade{
			ID:                     v.ID,
			UserID:                 v.UserID,
			FromCoinMintAddress:    v.FromCoinMintAddress,
			FromCoinPKID:           v.FromCoinPKID,
			ToCoinMintAddress:      v.ToCoinMintAddress,
			ToCoinPKID:             v.ToCoinPKID,
			CoinSymbol:             v.CoinSymbol,
			Type:                   v.Type,
			Amount:                 v.Amount,
			Price:                  v.Price,
			Fee:                    v.Fee,
			TotalFeeAmount:         v.TotalFeeAmount,
			TotalFeeMint:           v.TotalFeeMint,
			PlatformFeeAmount:      v.PlatformFeeAmount,
			PlatformFeePercent:     v.PlatformFeePercent,
			PlatformFeeMint:        v.PlatformFeeMint,
			PlatformFeeDestination: v.PlatformFeeDestination,
			RouteFeeAmount:         v.RouteFeeAmount,
			RouteFeeMints:          v.RouteFeeMints,
			RouteFeeDetails:        v.RouteFeeDetails,
			PriceImpactPercent:     v.PriceImpactPercent,
			Status:                 v.Status,
			TransactionHash:        v.TransactionHash,
			UnsignedTransaction:    v.UnsignedTransaction,
			CreatedAt:              v.CreatedAt,
			CompletedAt:            v.CompletedAt,
			Confirmations:          v.Confirmations,
			Finalized:              v.Finalized,
			Error:                  v.Error,
		}
	case schema.RawCoin:
		return &model.RawCoin{
			ID:               v.ID, // Added
			MintAddress:      v.MintAddress,
			Symbol:           v.Symbol,
			Name:             v.Name,
			Decimals:         v.Decimals,
			LogoUrl:          v.LogoUrl,
			UpdatedAt:        v.UpdatedAt.Format(time.RFC3339),
			JupiterCreatedAt: v.JupiterCreatedAt, // Map JupiterCreatedAt field
		}
	case schema.Wallet:
		return &model.Wallet{
			ID:        v.ID,
			PublicKey: v.PublicKey,
			CreatedAt: v.CreatedAt,
		}
	// If S can be model.ApiStat, and M is model.ApiStat
	case model.ApiStat:
		// When S is model.ApiStat, v is model.ApiStat. We return a pointer to it.
		// Ensure the return type matches what the caller of toModel expects (any, which will be asserted to *M).
		// If M is also model.ApiStat, this is direct.
		copiedStat := v // Create a copy
		return &copiedStat
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
			MintAddress:      v.MintAddress,
			Name:             v.Name,
			Symbol:           v.Symbol,
			Decimals:         v.Decimals,
			Description:      v.Description,
			IconUrl:          v.IconUrl,
			ResolvedIconUrl:  v.ResolvedIconUrl,
			Tags:             v.Tags,
			Price:            v.Price,
			Change24h:        v.Change24h,
			MarketCap:        v.MarketCap,
			Volume24h:        v.Volume24h,
			Website:          v.Website,
			Twitter:          v.Twitter,
			Telegram:         v.Telegram,
			Discord:          v.Discord,
			IsTrending:       v.IsTrending,
			LastUpdated:      time.Now(),
			JupiterCreatedAt: v.JupiterListedAt, // Map JupiterListedAt to JupiterCreatedAt
		}
		if v.ID != 0 {
			sCoin.ID = v.ID
		}
		return sCoin
	case model.Trade:
		return &schema.Trade{
			ID:                     v.ID,
			UserID:                 v.UserID,
			FromCoinMintAddress:    v.FromCoinMintAddress,
			FromCoinPKID:           v.FromCoinPKID,
			ToCoinMintAddress:      v.ToCoinMintAddress,
			ToCoinPKID:             v.ToCoinPKID,
			CoinSymbol:             v.CoinSymbol,
			Type:                   v.Type,
			Amount:                 v.Amount,
			Price:                  v.Price,
			Fee:                    v.Fee,
			TotalFeeAmount:         v.TotalFeeAmount,
			TotalFeeMint:           v.TotalFeeMint,
			PlatformFeeAmount:      v.PlatformFeeAmount,
			PlatformFeePercent:     v.PlatformFeePercent,
			PlatformFeeMint:        v.PlatformFeeMint,
			PlatformFeeDestination: v.PlatformFeeDestination,
			RouteFeeAmount:         v.RouteFeeAmount,
			RouteFeeMints:          v.RouteFeeMints,
			RouteFeeDetails:        v.RouteFeeDetails,
			PriceImpactPercent:     v.PriceImpactPercent,
			Status:                 v.Status,
			TransactionHash:        v.TransactionHash,
			UnsignedTransaction:    v.UnsignedTransaction,
			CreatedAt:              v.CreatedAt,
			CompletedAt:            v.CompletedAt,
			Confirmations:          v.Confirmations,
			Finalized:              v.Finalized,
			Error:                  v.Error,
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
			UpdatedAt:        updatedAt,          // Parsed from model's string UpdatedAt
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
	// If M is model.ApiStat, and S is model.ApiStat
	case model.ApiStat:
		// When M is model.ApiStat, v is model.ApiStat. We return a pointer to it.
		// Ensure the return type matches what the caller of fromModel expects (any, which will be asserted to *S for GORM).
		// If S is also model.ApiStat, this is direct.
		copiedStat := v // Create a copy
		return &copiedStat
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
			"mint_address", "name", "symbol", "decimals", "description", "icon_url", "resolved_icon_url", "tags",
			"price", "change_24h", "market_cap", "volume_24h", "website",
			"twitter", "telegram", "discord", "is_trending", "last_updated", "jupiter_created_at",
		}
	case *schema.Trade:
		// Explicitly list columns to update, excluding PK 'id'
		return []string{
			"user_id", "from_coin_mint_address", "from_coin_pk_id", "to_coin_mint_address", "to_coin_pk_id", "coin_symbol",
			"type", "amount", "price", "fee", "total_fee_amount", "total_fee_mint",
			"platform_fee_amount", "platform_fee_percent", "platform_fee_mint", "platform_fee_destination",
			"route_fee_amount", "route_fee_mints", "route_fee_details", "price_impact_percent",
			"status", "transaction_hash", "unsigned_transaction",
			"completed_at", "confirmations", "finalized", "error", // CreatedAt is usually set on create
		}
	case *schema.RawCoin:
		// Explicitly list columns to update, excluding PK 'id'
		return []string{"mint_address", "symbol", "name", "decimals", "logo_url", "updated_at", "jupiter_created_at"}
	case *schema.Wallet:
		// Explicitly list columns to update, excluding PK 'id'
		return []string{"public_key"} // CreatedAt is usually set on create
	case *model.ApiStat: // If S is model.ApiStat
		// Columns for ApiStat to update on conflict. ID is PK. Date, ServiceName, EndpointName are part of conflict key.
		return []string{"count"}
	default:
		panic(fmt.Sprintf("unsupported type for getColumnNames: %T", data))
	}
}
