package coin

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"time"

	"slices"

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

	// Store config for later use in enrichment
	s.xstocksConfig = &config

	slog.InfoContext(ctx, "Processing xStocks tokens", "count", len(config.Tokens))

	// Bulk check which tokens already exist
	addresses := make([]string, len(config.Tokens))
	tokenMap := make(map[string]struct {
		Symbol      string
		MetadataURI string
	})

	for i, token := range config.Tokens {
		addresses[i] = token.Address
		tokenMap[token.Address] = struct {
			Symbol      string
			MetadataURI string
		}{
			Symbol:      token.Symbol,
			MetadataURI: token.MetadataURI,
		}
	}

	// Get all existing coins with these addresses
	existingCoins, err := s.store.Coins().GetByAddresses(ctx, addresses)
	if err != nil {
		slog.WarnContext(ctx, "Failed to bulk fetch existing coins", "error", err)
		// Fall back to individual checks if bulk fails
		existingCoins = []model.Coin{}
	}

	// Create map of existing coins for quick lookup
	existingCoinMap := make(map[string]*model.Coin)
	for i := range existingCoins {
		existingCoinMap[existingCoins[i].Address] = &existingCoins[i]
	}

	addedCount := 0
	updatedCount := 0

	// Collect tokens that need to be created
	var tokensToCreate []struct {
		Symbol      string
		Address     string
		MetadataURI string
	}

	for _, token := range config.Tokens {
		// Check if coin already exists using bulk lookup
		if existingCoin, exists := existingCoinMap[token.Address]; exists {
			// Coin exists - check if it has xstocks tag
			hasTag := slices.Contains(existingCoin.Tags, "xstocks")

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

		// Token doesn't exist, add to creation list
		tokensToCreate = append(tokensToCreate, struct {
			Symbol      string
			Address     string
			MetadataURI string
		}{
			Symbol:      token.Symbol,
			Address:     token.Address,
			MetadataURI: token.MetadataURI,
		})
	}

	// Process new tokens sequentially to avoid rate limits
	if len(tokensToCreate) > 0 {
		slog.InfoContext(ctx, "Processing new xStock tokens", "count", len(tokensToCreate))

		for _, token := range tokensToCreate {
			// Check if token has market data in Birdeye
			tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, token.Address)
			if err != nil {
				slog.WarnContext(ctx, "Failed to fetch Birdeye data for xStock during initialization",
					"symbol", token.Symbol,
					"address", token.Address,
					"error", err)
				continue
			}

			if !tokenOverview.Success || tokenOverview.Data.Address == "" || tokenOverview.Data.Price <= 0 || tokenOverview.Data.LogoURI == "" {
				slog.InfoContext(ctx, "Skipping xStock - no valid market data in Birdeye",
					"symbol", token.Symbol,
					"address", token.Address,
					"success", tokenOverview.Success,
					"hasData", tokenOverview.Data.Address != "",
					"hasLogo", tokenOverview.Data.LogoURI != "",
					"price", tokenOverview.Data.Price)
				continue
			}

			// Create entry with Birdeye data
			data := tokenOverview.Data
			coin := &model.Coin{
				Address:                token.Address,
				Symbol:                 token.Symbol,
				Name:                   data.Name,
				Decimals:               data.Decimals,
				LogoURI:                data.LogoURI,
				Tags:                   []string{"xstocks"},
				Volume24hUSD:           data.Volume24hUSD,
				Price:                  data.Price,
				Marketcap:              data.MarketCap,
				Price24hChangePercent:  data.Price24hChangePercent,
				Volume24hChangePercent: data.Volume24hChangePercent,
				Liquidity:              data.Liquidity,
				FDV:                    data.FDV,
				CreatedAt:              time.Now().Format(time.RFC3339),
				LastUpdated:            time.Now().Format(time.RFC3339),
			}

			// Process logo through image proxy to upload to S3
			s.processLogoURL(ctx, coin)

			if err := s.store.Coins().Create(ctx, coin); err != nil {
				slog.ErrorContext(ctx, "Failed to create xStock coin",
					"symbol", token.Symbol,
					"address", token.Address,
					"error", err)
			} else {
				addedCount++
				slog.InfoContext(ctx, "Created xStock coin entry with market data",
					"symbol", token.Symbol,
					"address", token.Address,
					"price", data.Price)
			}

			// Small delay to avoid rate limits
			time.Sleep(100 * time.Millisecond)
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
	coins, err := s.store.SearchCoins(ctx, "", []string{"xstocks"}, 0, 0, 0, "symbol", false)
	if err != nil {
		return fmt.Errorf("failed to fetch xStocks coins: %w", err)
	}

	enrichedCount := 0
	for _, coin := range coins {
		// Skip if already has complete market data and was updated recently
		if coin.Price > 0 && coin.LogoURI != "" && s.isCoinMarketDataFresh(&coin) {
			slog.DebugContext(ctx, "Skipping xStock enrichment - already has fresh data",
				"symbol", coin.Symbol,
				"address", coin.Address,
				"price", coin.Price,
				"logoURI", coin.LogoURI)
			continue
		}

		slog.InfoContext(ctx, "Enriching xStock token",
			"symbol", coin.Symbol,
			"address", coin.Address,
			"hasPrice", coin.Price > 0,
			"hasLogo", coin.LogoURI != "")

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
			slog.WarnContext(ctx, "Birdeye API returned unsuccessful or empty data",
				"symbol", coin.Symbol,
				"address", coin.Address,
				"success", tokenOverview.Success,
				"hasData", tokenOverview.Data.Address != "")
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

		// Process logo through image proxy to upload to S3
		s.processLogoURL(ctx, &updatedCoin)

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
