package coin

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

type scrapedTokenInfo struct {
	MintAddress string   `json:"mint_address"`
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Price       string   `json:"price"`
	Change24h   string   `json:"change_24h"`
	Volume24h   string   `json:"volume_24h"`
	MarketCap   string   `json:"market_cap"`
	IconURL     string   `json:"icon_url"`
	Tags        []string `json:"tags"`
}

// UpdateTrendingTokensFromBirdeye orchestrates fetching and enrichment of trending tokens.
func (s *Service) UpdateTrendingTokensFromBirdeye(ctx context.Context) (*TrendingTokensOutput, error) {
	slog.Info("Starting trending token fetch and enrichment process...")

	// Step 1: Get trending tokens from Birdeye
	fetchTime := time.Now() // Capture fetch attempt time
	birdeyeTokens, err := s.birdeyeClient.GetTrendingTokens(ctx, birdeye.TrendingTokensParams{})
	if err != nil {
		return nil, fmt.Errorf("failed to get trending tokens from Birdeye: %w", err)
	}

	if len(birdeyeTokens.Data.Tokens) == 0 {
		slog.Info("No trending tokens received from Birdeye. Proceeding with empty set.")
		return &TrendingTokensOutput{
			FetchTimestamp: fetchTime, // Use captured time
			Coins:          []model.Coin{},
		}, nil

	}
	slog.Info("Successfully received trending tokens from Birdeye", "count", len(birdeyeTokens.Data.Tokens))

	// Adapt birdeye.TokenDetails to []scrapedTokenInfo for now
	scrapedTokens := make([]scrapedTokenInfo, 0, len(birdeyeTokens.Data.Tokens))
	for _, t := range birdeyeTokens.Data.Tokens {
		scrapedTokens = append(scrapedTokens, scrapedTokenInfo{
			MintAddress: t.Address,
			Name:        t.Name,
			Symbol:      t.Symbol,
			Price:       fmt.Sprintf("%f", t.Price),
			Change24h:   fmt.Sprintf("%f", t.Price24hChangePercent),
			Volume24h:   fmt.Sprintf("%f", t.Volume24hUSD),
			MarketCap:   fmt.Sprintf("%f", t.MarketCap),
			IconURL:     t.LogoURI,
			Tags:        t.Tags,
		})
	}

	// Step 2: Enrich the scraped tokens concurrently
	enrichedCoins, err := s.processBirdeyeTokens(ctx, scrapedTokens) // scrapedTokens will be empty if birdeyeTokens.Data was empty
	if err != nil {
		// This path should ideally not be hit if scrapedTokens is empty,
		// as processBirdeyeTokens should handle empty input gracefully.
		// If it is hit, it implies an issue in processBirdeyeTokens with empty input
		// or a genuine error during an attempted enrichment (if scrapedTokens wasn't empty).
		return nil, fmt.Errorf("error during token enrichment process: %w", err)
	}

	// If birdeyeTokens.Data was NOT empty, but enrichment resulted in ZERO coins,
	// this is a case to log carefully.
	if len(birdeyeTokens.Data.Tokens) > 0 && len(enrichedCoins) == 0 {
		slog.Warn("Birdeye provided trending tokens, but none were successfully enriched.")
		// We will still return an empty set and no error to allow the refresh cycle to complete.
	}
	// If birdeyeTokens.Data was empty, then enrichedCoins will also be empty here, which is expected.

	slog.Info("Enrichment process complete", "input_from_birdeye_count", len(birdeyeTokens.Data.Tokens), "successful_enriched_count", len(enrichedCoins))

	// Step 3: Prepare the final output
	finalOutput := &TrendingTokensOutput{
		FetchTimestamp: fetchTime, // Use captured time
		Coins:          enrichedCoins,
	}

	// Log summary
	slog.Info("--- Trending Token Data Prepared ---")
	slog.Info("Data prepared",
		"timestamp", finalOutput.FetchTimestamp.Format(time.RFC3339),
		"total_coins", len(finalOutput.Coins))

	// Optionally log details of first few tokens
	for i, t := range finalOutput.Coins {
		if i >= 3 {
			slog.Info("...")
			break
		}
		slog.Info("Token details",
			"index", i,
			"mint", t.MintAddress,
			"name", t.Name,
			"symbol", t.Symbol,
			"price", t.Price,
			"volume_24h", t.Volume24h)
	}

	return finalOutput, nil
}

// processBirdeyeTokens takes basic scraped info and enriches it using external APIs concurrently.
func (s *Service) processBirdeyeTokens(ctx context.Context, tokensToEnrich []scrapedTokenInfo) ([]model.Coin, error) {
	scrapeMaxConcurrentEnrich := 3
	slog.Info("Executing token enrichment",
		"token_count", len(tokensToEnrich),
		"concurrency", scrapeMaxConcurrentEnrich)

	enrichedCoins := make([]model.Coin, 0, len(tokensToEnrich))
	var wg sync.WaitGroup
	var mu sync.Mutex
	sem := make(chan struct{}, scrapeMaxConcurrentEnrich)
	var encounteredErrors []error
	var errMu sync.Mutex // Mutex to protect encounteredErrors slice

	// Derive a context for the enrichment phase from the incoming context
	// Allow roughly 20s per token enrichment as a timeout for this phase.
	enrichPhaseTimeout := time.Duration(len(tokensToEnrich)*20) * time.Second
	enrichCtx, cancelEnrich := context.WithTimeout(ctx, enrichPhaseTimeout)
	defer cancelEnrich()

	for _, scrapedToken := range tokensToEnrich {
		wg.Add(1)
		sem <- struct{}{} // Acquire semaphore slot

		go func(token scrapedTokenInfo) {
			defer wg.Done()
			defer func() { <-sem }() // Release semaphore slot

			// Create a context for this specific enrichment task
			enrichTaskCtx, enrichTaskCancel := context.WithTimeout(enrichCtx, 45*time.Second) // Timeout for one token
			defer enrichTaskCancel()

			slog.Debug("Enriching token", "name", token.Name, "mint_address", token.MintAddress)

			// Parse Price, Volume, MarketCap from strings to float64
			initialPrice, err := strconv.ParseFloat(strings.ReplaceAll(token.Price, ",", ""), 64)
			if err != nil {
				slog.Warn("Failed to parse price string, defaulting to 0", "priceStr", token.Price, "name", token.Name, "mint", token.MintAddress, "error", err)
				initialPrice = 0
			}

			initialVolume, err := strconv.ParseFloat(strings.ReplaceAll(token.Volume24h, ",", ""), 64)
			if err != nil {
				slog.Warn("Failed to parse volume string, defaulting to 0", "volumeStr", token.Volume24h, "name", token.Name, "mint", token.MintAddress, "error", err)
				initialVolume = 0
			}

			initialMarketCap, err := strconv.ParseFloat(strings.ReplaceAll(token.MarketCap, ",", ""), 64)
			if err != nil {
				slog.Warn("Failed to parse market cap string, defaulting to 0", "marketCapStr", token.MarketCap, "name", token.Name, "mint", token.MintAddress, "error", err)
				initialMarketCap = 0
			}

			enriched, err := s.EnrichCoinData(
				enrichTaskCtx, // Use the task-specific context
				token.MintAddress,
				token.Name,
				token.Symbol,
				token.IconURL,
				initialPrice,
				initialVolume,
				initialMarketCap, // Pass parsed market cap
				token.Tags,       // Pass tags
			)
			if err != nil {
				errMessage := fmt.Sprintf("Failed EnrichCoinData for %s (%s): %v", token.Name, token.MintAddress, err)
				slog.Error("Enrichment failed",
					"name", token.Name,
					"mint_address", token.MintAddress,
					"error", err)
				// Record the error
				errMu.Lock()
				encounteredErrors = append(encounteredErrors, fmt.Errorf("%s", errMessage)) // Append formatted error
				errMu.Unlock()
				// Decide whether to add partial data if available
				if enriched == nil {
					return // Skip if enrichment critically failed
				}
				slog.Warn("Adding partially enriched data despite error", "name", token.Name)
			}

			if enriched == nil {
				slog.Error("EnrichCoinData returned nil without explicit error",
					"name", token.Name,
					"mint_address", token.MintAddress)
				return
			}

			// Add successfully (or partially) enriched coin
			mu.Lock()
			enriched.IsTrending = true
			enrichedCoins = append(enrichedCoins, *enriched)
			mu.Unlock()
			slog.Info("Successfully processed enrichment", "name", enriched.Name, "mint_address", enriched.MintAddress)
		}(scrapedToken)
	}

	wg.Wait()
	close(sem)

	// Check if any errors occurred during enrichment
	if len(encounteredErrors) > 0 {
		// Log that errors occurred, but don't return an error here.
		// We want to proceed to save the partially enriched data.
		slog.Warn("Enrichment finished with errors, proceeding with successful tokens",
			"error_count", len(encounteredErrors))
		// return enrichedCoins, fmt.Errorf("enrichment failed for one or more tokens (first error: %w)", encounteredErrors[0])
	}

	// This logging might be redundant now, consider removing or adjusting
	slog.Info("Enrichment summary",
		"successful_tokens", len(enrichedCoins),
		"error_count", len(encounteredErrors))

	// This block seems like a leftover from previous attempts, ensure it's fully commented or removed if the above check handles it.
	// if len(encounteredErrors) > 0 {
	//      log.Printf("Enrichment finished with %d errors. Proceeding to save successfully enriched tokens.", len(encounteredErrors))
	//      // Don't return the error here, allow saving partial results.
	//      // return fmt.Errorf("encountered errors during enrichment process: %w", encounteredErrors[0])
	// }

	return enrichedCoins, nil // Return successfully enriched coins and nil error
}
