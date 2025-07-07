package coin

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"gopkg.in/yaml.v2"
)

//go:embed xstocks.yaml
var xstocksYAML []byte

type XStocksConfig struct {
	Tokens []struct {
		Symbol      string `yaml:"symbol"`
		Address     string `yaml:"address"`
		MetadataURI string `yaml:"metadata_uri"`
	} `yaml:"tokens"`
}

// initializeXStocks checks and imports xStocks tokens during service startup
func (s *Service) initializeXStocks(ctx context.Context) error {
	slog.InfoContext(ctx, "Initializing xStocks tokens...")

	var config XStocksConfig
	if err := yaml.Unmarshal(xstocksYAML, &config); err != nil {
		return fmt.Errorf("failed to parse xstocks.yaml: %w", err)
	}

	slog.InfoContext(ctx, "Processing xStocks tokens", "count", len(config.Tokens))

	addedCount := 0
	updatedCount := 0

	for _, token := range config.Tokens {
		// Check if coin already exists
		existingCoin, err := s.store.Coins().GetByField(ctx, "address", token.Address)
		if err == nil && existingCoin != nil {
			// Coin exists - check if it has xstocks tag
			hasTag := false
			for _, tag := range existingCoin.Tags {
				if tag == "xstocks" {
					hasTag = true
					break
				}
			}

			if !hasTag {
				// Add xstocks tag
				existingCoin.Tags = append(existingCoin.Tags, "xstocks")
				existingCoin.LastUpdated = time.Now().Format(time.RFC3339)
				if err := s.store.Coins().Update(ctx, existingCoin); err != nil {
					slog.ErrorContext(ctx, "Failed to update tags for xStock", 
						"symbol", token.Symbol, 
						"address", token.Address,
						"error", err)
				} else {
					updatedCount++
					slog.DebugContext(ctx, "Added xstocks tag to existing coin", 
						"symbol", token.Symbol,
						"address", token.Address)
				}
			}
			continue
		}

		// Create basic entry without Birdeye data (will be fetched on demand)
		coin := &model.Coin{
			Address:     token.Address,
			Symbol:      token.Symbol,
			Name:        strings.TrimSuffix(token.Symbol, "x"), // Remove 'x' suffix for name
			Tags:        []string{"xstocks"},
			CreatedAt:   time.Now().Format(time.RFC3339),
			LastUpdated: time.Now().Format(time.RFC3339),
		}

		if err := s.store.Coins().Create(ctx, coin); err != nil {
			slog.ErrorContext(ctx, "Failed to create xStock coin", 
				"symbol", token.Symbol,
				"address", token.Address, 
				"error", err)
		} else {
			addedCount++
			slog.DebugContext(ctx, "Created xStock coin entry", 
				"symbol", token.Symbol,
				"address", token.Address)
		}
	}

	slog.InfoContext(ctx, "xStocks initialization completed", 
		"totalTokens", len(config.Tokens),
		"newlyAdded", addedCount,
		"updated", updatedCount)

	return nil
}

// EnrichXStocksData fetches and updates market data for xStocks tokens
func (s *Service) EnrichXStocksData(ctx context.Context) error {
	slog.InfoContext(ctx, "Enriching xStocks token data...")

	// Get all xStocks tokens that need enrichment
	coins, err := s.store.SearchCoins(ctx, "", []string{"xstocks"}, 0, 100, 0, "symbol", false)
	if err != nil {
		return fmt.Errorf("failed to fetch xStocks coins: %w", err)
	}

	enrichedCount := 0
	for _, coin := range coins {
		// Skip if already has market data and was updated recently
		if coin.Price > 0 && s.isCoinMarketDataFresh(&coin) {
			continue
		}

		// Fetch fresh data from Birdeye
		tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, coin.Address)
		if err != nil {
			slog.WarnContext(ctx, "Failed to fetch Birdeye data for xStock", 
				"symbol", coin.Symbol,
				"address", coin.Address,
				"error", err)
			continue
		}

		if !tokenOverview.Success || tokenOverview.Data.Address == "" {
			continue
		}

		// Update coin with Birdeye data
		data := tokenOverview.Data
		updatedCoin := model.Coin{
			ID:                     coin.ID,
			Address:                coin.Address,
			Symbol:                 coin.Symbol,
			Name:                   data.Name,
			Decimals:               data.Decimals,
			LogoURI:                data.LogoURI,
			Description:            coin.Description,
			Tags:                   coin.Tags, // Preserve existing tags
			Volume24hUSD:           data.Volume24hUSD,
			Price:                  data.Price,
			Marketcap:              data.MarketCap,
			Price24hChangePercent:  data.Price24hChangePercent,
			Volume24hChangePercent: data.Volume24hChangePercent,
			Liquidity:              data.Liquidity,
			FDV:                    data.FDV,
			LastUpdated:            time.Now().Format(time.RFC3339),
		}

		if err := s.store.Coins().Update(ctx, &updatedCoin); err != nil {
			slog.ErrorContext(ctx, "Failed to update xStock with Birdeye data", 
				"symbol", coin.Symbol,
				"address", coin.Address,
				"error", err)
		} else {
			enrichedCount++
			slog.DebugContext(ctx, "Successfully enriched xStock data", 
				"symbol", coin.Symbol,
				"address", coin.Address,
				"price", data.Price)
		}

		// Small delay to avoid rate limits
		time.Sleep(100 * time.Millisecond)
	}

	slog.InfoContext(ctx, "xStocks enrichment completed", 
		"totalTokens", len(coins),
		"enriched", enrichedCount)

	return nil
}