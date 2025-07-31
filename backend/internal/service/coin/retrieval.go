package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

// Basic coin retrieval operations

func (s *Service) GetCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	if opts.SortBy == nil || *opts.SortBy == "" {
		defaultSortBy := "volume_24h_usd"
		defaultSortDesc := true
		opts.SortBy = &defaultSortBy
		opts.SortDesc = &defaultSortDesc
		slog.DebugContext(ctx, "Applying default sort order to GetCoins", "sortBy", *opts.SortBy, "sortDesc", *opts.SortDesc)
	}

	const defaultLimit = 20
	const maxLimit = 100

	if opts.Limit == nil || *opts.Limit <= 0 {
		slog.DebugContext(ctx, "Applying default limit to GetCoins", "defaultLimit", defaultLimit)
		limit := defaultLimit
		opts.Limit = &limit
	} else if *opts.Limit > maxLimit {
		slog.WarnContext(ctx, "Requested limit exceeds maximum, capping limit", "requestedLimit", *opts.Limit, "maxLimit", maxLimit)
		limit := maxLimit
		opts.Limit = &limit
	}

	coins, totalCount, err := s.store.Coins().List(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list coins: %w", err)
	}
	return coins, totalCount, nil
}

func (s *Service) GetCoinByID(ctx context.Context, idStr string) (*model.Coin, error) {
	if _, parseErr := strconv.ParseUint(idStr, 10, 64); parseErr != nil {
		slog.InfoContext(ctx, "GetCoinByID received non-numeric ID", slog.String("idStr", idStr), slog.Any("error", parseErr))
		return nil, fmt.Errorf("invalid coin ID format: %s is not a valid numeric ID", idStr)
	}
	coin, err := s.store.Coins().Get(ctx, idStr)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			slog.InfoContext(ctx, "Coin not found by numeric ID", slog.String("idStr", idStr))
			return nil, fmt.Errorf("coin with ID %s not found: %w", idStr, db.ErrNotFound)
		}
		slog.ErrorContext(ctx, "Failed to get coin by numeric ID", slog.String("idStr", idStr), slog.Any("error", err))
		return nil, fmt.Errorf("failed to get coin by ID %s: %w", idStr, err)
	}
	return coin, nil
}

func (s *Service) GetCoinByAddress(ctx context.Context, address string) (*model.Coin, error) {
	slog.InfoContext(ctx, "GetCoinByAddress called", slog.String("address", address))
	
	// Special handling for native SOL - it's not a real Solana address
	if address == model.NativeSolMint {
		slog.InfoContext(ctx, "Fetching native SOL coin", slog.String("address", address))
		return s.getNativeSolCoin(ctx)
	}
	
	if !util.IsValidSolanaAddress(address) {
		slog.ErrorContext(ctx, "Invalid Solana address", slog.String("address", address))
		return nil, fmt.Errorf("invalid address: %s", address)
	}

	// Step 1: Check cache first for fresh data
	cacheKey := fmt.Sprintf("coin:%s", address)
	if cachedCoins, found := s.cache.Get(cacheKey); found && len(cachedCoins) > 0 {
		slog.DebugContext(ctx, "Coin found in cache with fresh data",
			slog.String("address", address),
			slog.String("symbol", cachedCoins[0].Symbol))
		return &cachedCoins[0], nil
	}

	// Step 2: Check database if not in cache
	coin, err := s.store.Coins().GetByField(ctx, "address", address)
	if err == nil {
		slog.InfoContext(ctx, "Coin found in database", 
			slog.String("address", address),
			slog.String("symbol", coin.Symbol),
			slog.String("name", coin.Name),
			slog.Uint64("id", coin.ID))
		
		// Check if market data is fresh (< 24 hours old)
		if s.isCoinMarketDataFresh(coin) {
			slog.DebugContext(ctx, "Coin found with fresh market data", 
				slog.String("address", address), 
				slog.String("lastUpdated", coin.LastUpdated),
				slog.Float64("price", coin.Price))
			// Cache the fresh coin for quick access
			s.cache.Set(cacheKey, []model.Coin{*coin}, 2*time.Minute)
			return coin, nil
		}

		// Market data is stale, refresh with market data only
		slog.InfoContext(ctx, "Coin found but market data is stale, refreshing", 
			slog.String("address", address), 
			slog.String("lastUpdated", coin.LastUpdated))
		updatedCoin, err := s.updateCoinMarketData(ctx, coin)
		if err == nil && updatedCoin != nil {
			// Cache the updated coin
			s.cache.Set(cacheKey, []model.Coin{*updatedCoin}, 2*time.Minute)
		}
		return updatedCoin, err
	}

	if !errors.Is(err, db.ErrNotFound) {
		slog.ErrorContext(ctx, "Database error when fetching coin", 
			slog.String("address", address), 
			slog.Any("error", err))
		return nil, fmt.Errorf("error fetching coin %s from database: %w", address, err)
	}

	// Step 3: Fetch completely new coin from Birdeye
	slog.InfoContext(ctx, "Coin not found in database, fetching from Birdeye", slog.String("address", address))
	newCoin, err := s.fetchNewCoin(ctx, address)
	if err == nil && newCoin != nil {
		// Cache the newly fetched coin
		s.cache.Set(cacheKey, []model.Coin{*newCoin}, 2*time.Minute)
	}
	return newCoin, err
}

// isCoinMarketDataFresh checks if coin market data was updated within the last 24 hours
func (s *Service) isCoinMarketDataFresh(coin *model.Coin) bool {
	if coin.LastUpdated == "" {
		return false
	}

	lastUpdated, err := time.Parse(time.RFC3339, coin.LastUpdated)
	if err != nil {
		slog.Warn("Failed to parse LastUpdated time", "address", coin.Address, "lastUpdated", coin.LastUpdated, "error", err)
		return false
	}

	// Consider fresh if updated within last 24 hours
	return time.Since(lastUpdated) < 24*time.Hour
}

// updateCoinMarketData updates only the market data (price, volume, etc.) for an existing coin
func (s *Service) updateCoinMarketData(ctx context.Context, coin *model.Coin) (*model.Coin, error) {
	// Use the single token overview endpoint instead of batch trade data (which requires premium)
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, coin.Address)
	if err != nil {
		slog.WarnContext(ctx, "Failed to fetch token overview from Birdeye", slog.String("address", coin.Address), slog.Any("error", err))
		return coin, nil // Return stale data rather than failing
	}

	if !tokenOverview.Success || tokenOverview.Data.Address == "" {
		slog.WarnContext(ctx, "No valid data returned for coin", slog.String("address", coin.Address))
		return coin, nil // Return stale data
	}

	// Update coin with fresh data
	data := tokenOverview.Data
	coin.Price = data.Price
	coin.Price24hChangePercent = data.Price24hChangePercent
	coin.Marketcap = data.MarketCap
	coin.Volume24hUSD = data.Volume24hUSD
	coin.Volume24hChangePercent = data.Volume24hChangePercent
	coin.Liquidity = data.Liquidity
	coin.FDV = data.FDV
	coin.Rank = data.Rank
	coin.LastUpdated = time.Now().Format(time.RFC3339)


	// Update in database
	if updateErr := s.store.Coins().Update(ctx, coin); updateErr != nil {
		slog.WarnContext(ctx, "Failed to update coin market data in database", slog.String("address", coin.Address), slog.Any("error", updateErr))
		// Continue anyway, return the coin with updated data even if DB update fails
	} else {
		slog.DebugContext(ctx, "Successfully updated coin market data", slog.String("address", coin.Address), slog.Float64("price", coin.Price))
	}

	return coin, nil
}

// fetchNewCoin fetches a completely new coin from Birdeye (metadata + market data)
func (s *Service) fetchNewCoin(ctx context.Context, address string) (*model.Coin, error) {
	// Use the single token overview endpoint instead of batch (which requires premium)
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, address)
	if err != nil {
		// Check if it's an API key/permissions error
		if strings.Contains(err.Error(), "401") || strings.Contains(err.Error(), "API key") || strings.Contains(err.Error(), "suspended") {
			return nil, fmt.Errorf("unable to access market data at this time. Please try again later")
		}
		return nil, fmt.Errorf("unable to fetch token data. Please try again")
	}

	if !tokenOverview.Success || tokenOverview.Data.Address == "" {
		return nil, fmt.Errorf("token not found. Please check the address and try again")
	}

	tokenData := tokenOverview.Data

	// Check for naughty words
	if s.coinContainsNaughtyWord(tokenData.Name, "") {
		return nil, fmt.Errorf("token contains inappropriate content: %s", tokenData.Name)
	}

	// Create coin from Birdeye data
	coin := &model.Coin{
		Address:                tokenData.Address,
		Name:                   tokenData.Name,
		Symbol:                 tokenData.Symbol,
		Decimals:               tokenData.Decimals,
		LogoURI:                tokenData.LogoURI,
		Tags:                   tokenData.Tags,
		Price:                  tokenData.Price,
		Price24hChangePercent:  tokenData.Price24hChangePercent,
		Marketcap:              tokenData.MarketCap,
		Volume24hUSD:           tokenData.Volume24hUSD,
		Volume24hChangePercent: tokenData.Volume24hChangePercent,
		Liquidity:              tokenData.Liquidity,
		FDV:                    tokenData.FDV,
		Rank:                   tokenData.Rank,
		CreatedAt:              time.Now().Format(time.RFC3339),
		LastUpdated:            time.Now().Format(time.RFC3339),
	}

	// Enrich with additional metadata if needed
	enrichedCoin, err := s.EnrichCoinData(ctx, &birdeye.TokenDetails{
		Address:  tokenData.Address,
		Name:     tokenData.Name,
		Symbol:   tokenData.Symbol,
		Decimals: tokenData.Decimals,
		LogoURI:  tokenData.LogoURI,
	})
	if err != nil {
		slog.WarnContext(ctx, "Failed to enrich coin data, using basic data", slog.String("address", address), slog.Any("error", err))
		// Use the coin we created above instead of failing
	} else {
		// Update with enriched data but preserve market data from Birdeye
		enrichedCoin.Price = coin.Price
		enrichedCoin.Price24hChangePercent = coin.Price24hChangePercent
		enrichedCoin.Marketcap = coin.Marketcap
		enrichedCoin.Volume24hUSD = coin.Volume24hUSD
		enrichedCoin.Volume24hChangePercent = coin.Volume24hChangePercent
		enrichedCoin.Liquidity = coin.Liquidity
		enrichedCoin.FDV = coin.FDV
		enrichedCoin.Rank = coin.Rank
		enrichedCoin.LastUpdated = coin.LastUpdated
		coin = enrichedCoin
	}


	// Final naughty word check after enrichment
	if s.coinContainsNaughtyWord(coin.Name, coin.Description) {
		return nil, fmt.Errorf("token contains inappropriate content after enrichment: %s", coin.Name)
	}

	// Process logo through image proxy to upload to S3
	s.processLogoURL(ctx, coin)

	// Save to database
	if createErr := s.store.Coins().Create(ctx, coin); createErr != nil {
		slog.WarnContext(ctx, "Failed to create new coin in database", slog.String("address", coin.Address), slog.Any("error", createErr))
	}

	slog.InfoContext(ctx, "Successfully fetched and saved new coin", slog.String("address", coin.Address))
	return coin, nil
}

func (s *Service) fetchAndCacheCoin(ctx context.Context, address string) (*model.Coin, error) {
	slog.DebugContext(ctx, "Starting dynamic coin enrichment", slog.String("address", address))

	// First try to fetch market data from Birdeye
	var initialData *birdeye.TokenDetails
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, address)
	if err != nil {
		slog.WarnContext(ctx, "Failed to fetch token overview from Birdeye, using minimal data", slog.String("address", address), slog.Any("error", err))
		// Fallback to minimal data if Birdeye fails
		initialData = &birdeye.TokenDetails{Address: address}
	} else if tokenOverview.Success && tokenOverview.Data.Address != "" {
		// Convert TokenOverviewData to TokenDetails
		initialData = &birdeye.TokenDetails{
			Address:                tokenOverview.Data.Address,
			Name:                   tokenOverview.Data.Name,
			Symbol:                 tokenOverview.Data.Symbol,
			Decimals:               tokenOverview.Data.Decimals,
			LogoURI:                tokenOverview.Data.LogoURI,
			Price:                  tokenOverview.Data.Price,
			Volume24hUSD:           tokenOverview.Data.Volume24hUSD,
			Volume24hChangePercent: tokenOverview.Data.Volume24hChangePercent,
			MarketCap:              tokenOverview.Data.MarketCap,
			Liquidity:              tokenOverview.Data.Liquidity,
			FDV:                    tokenOverview.Data.FDV,
			Rank:                   tokenOverview.Data.Rank,
			Price24hChangePercent:  tokenOverview.Data.Price24hChangePercent,
			Tags:                   tokenOverview.Data.Tags,
		}
		slog.DebugContext(ctx, "Successfully fetched token overview from Birdeye", slog.String("address", address), slog.String("name", initialData.Name), slog.String("symbol", initialData.Symbol), slog.Float64("price", initialData.Price), slog.Float64("marketcap", initialData.MarketCap))
	} else {
		slog.WarnContext(ctx, "Birdeye token overview returned unsuccessful or empty data, using minimal data", slog.String("address", address))
		// Fallback to minimal data if response is unsuccessful
		initialData = &birdeye.TokenDetails{Address: address}
	}

	if initialData != nil && s.coinContainsNaughtyWord(initialData.Name, initialData.Symbol) {
		return nil, fmt.Errorf("token name contains inappropriate content: %s", initialData.Name)
	}

	enrichedCoin, err := s.EnrichCoinData(ctx, initialData)
	if err != nil {
		slog.ErrorContext(ctx, "Dynamic coin enrichment failed", slog.String("address", address), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich coin %s: %w", address, err)
	}

	// <<< NAUGHTY WORD CHECK FOR NAME (post-enrichment) >>>
	if enrichedCoin != nil && s.coinContainsNaughtyWord(enrichedCoin.Name, enrichedCoin.Description) {
		return nil, fmt.Errorf("token name contains inappropriate content for address: %s after enrich", enrichedCoin.Address)
	}


	existingCoin, getErr := s.store.Coins().GetByField(ctx, "address", enrichedCoin.Address)
	if getErr == nil && existingCoin != nil {
		enrichedCoin.ID = existingCoin.ID
		if dbErr := s.store.Coins().Update(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to update enriched coin in store", slog.String("address", enrichedCoin.Address), slog.Any("error", dbErr))
		}
	} else {
		if dbErr := s.store.Coins().Create(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to create enriched coin in store", slog.String("address", enrichedCoin.Address), slog.Any("error", dbErr))
		}
	}
	slog.DebugContext(ctx, "Dynamic coin enrichment and storage attempt complete", slog.String("address", address))
	return enrichedCoin, nil
}

// updateCoin updates the price and market stats of a cached coin with fresh data from Birdeye
func (s *Service) updateCoin(ctx context.Context, coin *model.Coin) (*model.Coin, error) {
	slog.DebugContext(ctx, "Updating price and market stats for cached coin", slog.String("address", coin.Address), slog.Float64("currentPrice", coin.Price))

	// Fetch current price and market data from Birdeye token overview
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, coin.Address)
	if err != nil {
		slog.WarnContext(ctx, "Failed to fetch token overview from Birdeye", slog.String("address", coin.Address), slog.Any("error", err))
		return nil, err
	}

	// Update coin with fresh data from Birdeye token overview
	data := tokenOverview.Data
	coin.Price = data.Price
	coin.Price24hChangePercent = data.Price24hChangePercent
	coin.Marketcap = data.MarketCap
	coin.Volume24hUSD = data.Volume24hUSD
	coin.Volume24hChangePercent = data.Volume24hChangePercent
	coin.Liquidity = data.Liquidity
	coin.FDV = data.FDV
	coin.Rank = data.Rank
	coin.LastUpdated = time.Now().Format(time.RFC3339)

	// Update logo if it's available and we don't have one
	if data.LogoURI != "" && coin.LogoURI == "" {
		coin.LogoURI = data.LogoURI
		// Process the new logo through image proxy
		s.processLogoURL(ctx, coin)
	}


	// Update tags if available and we don't have any
	// TODO: We might want to keep our OWN tags since we use them
	// for filetering ie: trending, new, top-gainer, etc.
	if len(data.Tags) > 0 && len(coin.Tags) == 0 {
		coin.Tags = data.Tags
	}

	slog.DebugContext(ctx, "Successfully updated coin with fresh data from Birdeye token overview",
		slog.String("address", coin.Address),
		slog.Float64("newPrice", coin.Price),
		slog.Float64("marketCap", coin.Marketcap),
		slog.Float64("volume24h", coin.Volume24hUSD),
		slog.Float64("liquidity", coin.Liquidity))

	// Update the coin in the database with the new data
	if updateErr := s.store.Coins().Update(ctx, coin); updateErr != nil {
		slog.WarnContext(ctx, "Failed to update coin with fresh data in database", slog.String("address", coin.Address), slog.Any("error", updateErr))
		// Continue anyway, return the coin with updated data even if DB update fails
	} else {
		slog.DebugContext(ctx, "Successfully updated coin with fresh data in database", slog.String("address", coin.Address))
	}

	return coin, nil
}