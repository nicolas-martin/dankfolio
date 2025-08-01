package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Search functionality for coins

func (s *Service) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, opts db.ListOptions) ([]model.Coin, int32, error) {
	if len(query) > 256 {
		return nil, 0, fmt.Errorf("query string too long (max 256 chars): %d", len(query))
	}
	for i, tag := range tags {
		if len(tag) > 64 {
			return nil, 0, fmt.Errorf("tag at index %d too long (max 64 chars): %s", i, tag)
		}
	}
	if minVolume24h < 0 {
		return nil, 0, fmt.Errorf("min_volume_24h cannot be negative: %f", minVolume24h)
	}
	var limit, offset int32
	var sortBy string
	var sortDesc bool
	if opts.Limit != nil {
		limit = int32(*opts.Limit)
	}
	if opts.Offset != nil {
		offset = int32(*opts.Offset)
	}
	if opts.SortBy != nil {
		sortBy = *opts.SortBy
	}
	if opts.SortDesc != nil {
		sortDesc = *opts.SortDesc
	}

	// First try database search
	coins, err := s.store.SearchCoins(ctx, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search coins via store: %w", err)
	}

	// If we have results or filters are applied, return database results
	if len(coins) > 0 || len(tags) > 0 || minVolume24h > 0 {
		return coins, int32(len(coins)), nil
	}

	// If no results from database and query is not empty, try Birdeye search
	if query != "" && len(coins) == 0 {
		slog.InfoContext(ctx, "No results from database, searching via Birdeye",
			slog.String("query", query))
		return s.searchCoinsViaBirdeye(ctx, query, int(limit), int(offset))
	}

	return coins, int32(len(coins)), nil
}

// searchCoinsViaBirdeye searches for coins using Birdeye search API
func (s *Service) searchCoinsViaBirdeye(ctx context.Context, query string, limit, offset int) ([]model.Coin, int32, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("search:%s:%d:%d", query, limit, offset)
	if cachedCoins, found := s.cache.Get(cacheKey); found {
		slog.DebugContext(ctx, "Search results found in cache",
			slog.String("query", query),
			slog.Int("count", len(cachedCoins)))
		return cachedCoins, int32(len(cachedCoins)), nil
	}

	// Prepare search parameters
	searchParams := birdeye.SearchParams{
		Keyword:  query,
		SearchBy: birdeye.SearchByCombination, // Search by all fields
		Limit:    limit,
		Offset:   offset,
	}

	// Perform search
	searchResponse, err := s.birdeyeClient.Search(ctx, searchParams)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search via Birdeye: %w", err)
	}

	// Extract tokens from search response
	var searchTokens []birdeye.SearchToken
	for _, item := range searchResponse.Data.Items {
		if item.Type == "token" {
			searchTokens = append(searchTokens, item.Result...)
		}
	}

	// Convert search tokens to model coins
	coins := make([]model.Coin, 0, len(searchTokens))
	for _, token := range searchTokens {
		// Skip tokens with no volume
		if token.Volume24hUSD == 0 {
			continue
		}

		coin := model.Coin{
			Address:               token.Address,
			Name:                  token.Name,
			Symbol:                token.Symbol,
			Decimals:              token.Decimals,
			LogoURI:               token.LogoURI,
			Tags:                  token.Tags,
			Price:                 token.Price,
			Price24hChangePercent: token.Price24hChangePercent,
			Marketcap:             token.MarketCap,
			Volume24hUSD:          token.Volume24hUSD,
			Liquidity:             token.Liquidity,
			LastUpdated:           time.Now().Format(time.RFC3339),
		}

		// Process logo through image proxy to upload to S3
		s.processLogoURL(ctx, &coin)

		// Check if coin exists in DB and update/insert as needed
		existingCoin, err := s.store.Coins().GetByField(ctx, "address", token.Address)
		if err == nil {
			// Update existing coin with fresh data
			coin.ID = existingCoin.ID
			coin.CreatedAt = existingCoin.CreatedAt
			coin.LastUpdated = time.Now().Format(time.RFC3339)

			if err := s.store.Coins().Update(ctx, &coin); err != nil {
				slog.WarnContext(ctx, "Failed to update coin from search",
					slog.String("address", token.Address),
					slog.String("error", err.Error()))
			}
		} else if errors.Is(err, db.ErrNotFound) {
			// Create new coin
			coin.CreatedAt = time.Now().Format(time.RFC3339)
			coin.LastUpdated = time.Now().Format(time.RFC3339)

			if err := s.store.Coins().Create(ctx, &coin); err != nil {
				slog.WarnContext(ctx, "Failed to insert coin from search",
					slog.String("address", token.Address),
					slog.String("error", err.Error()))
			}
		}

		coins = append(coins, coin)
	}

	// Cache the results
	if len(coins) > 0 {
		s.cache.Set(cacheKey, coins, 5*time.Minute)
		slog.DebugContext(ctx, "Cached search results",
			slog.String("query", query),
			slog.Int("count", len(coins)))
	}

	return coins, int32(len(coins)), nil
}