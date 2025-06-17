package coin

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// UpdateTrendingTokensFromBirdeye orchestrates fetching and enrichment of trending tokens.
func (s *Service) UpdateTrendingTokensFromBirdeye(ctx context.Context) (*TrendingTokensOutput, error) {
	slog.Info("Starting trending token fetch and enrichment process...")

	// Step 1: Get trending tokens from Birdeye
	fetchTime := time.Now() // Capture fetch attempt time
	birdeyeTokens, err := s.birdeyeClient.GetTrendingTokens(ctx, birdeye.TrendingTokensParams{Limit: 10})
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

	// Step 2: Enrich the Birdeye tokens concurrently
	enrichedCoins, err := s.processBirdeyeTokens(ctx, birdeyeTokens.Data.Tokens) // Pass birdeye.TokenDetails directly
	if err != nil {
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
			"address", t.Address,
			"name", t.Name,
			"symbol", t.Symbol,
			"price", t.Price,
			"volume_24h", t.Volume24hUSD)
	}

	return finalOutput, nil
}

// processBirdeyeTokens takes Birdeye token details and enriches them using external APIs concurrently.
func (s *Service) processBirdeyeTokens(ctx context.Context, tokensToEnrich []birdeye.TokenDetails) ([]model.Coin, error) {
	scrapeMaxConcurrentEnrich := 3
	slog.Info("Executing token enrichment with Birdeye data",
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

	for _, birdeyeToken := range tokensToEnrich { // Renamed loop variable for clarity
		wg.Add(1)
		sem <- struct{}{} // Acquire semaphore slot

		go func(token birdeye.TokenDetails) { // Type updated here
			defer wg.Done()
			defer func() { <-sem }() // Release semaphore slot

			// Create a context for this specific enrichment task
			enrichTaskCtx, enrichTaskCancel := context.WithTimeout(enrichCtx, 45*time.Second) // Timeout for one token
			defer enrichTaskCancel()

			slog.Debug("Enriching token from Birdeye data", "name", token.Name, "mint_address", token.Address) // Use token.Address

			// Direct field access for Price, Volume, MarketCap, etc. No parsing needed.
			// Ensure EnrichCoinData is updated to accept these types and new fields.
			enriched, err := s.EnrichCoinData(enrichTaskCtx, &token)
			if err != nil {
				errMessage := fmt.Sprintf("Failed EnrichCoinData for %s (%s): %v", token.Name, token.Address, err)
				slog.Error("Enrichment failed",
					"name", token.Name,
					"mint_address", token.Address,
					"error", err)
				errMu.Lock()
				encounteredErrors = append(encounteredErrors, fmt.Errorf("%s", errMessage)) // Append formatted error
				errMu.Unlock()
				// Decide whether to add partial data if available
				if enriched == nil {
					return // Skip if enrichment critically failed
				}
				slog.Warn("Adding partially enriched data despite error", "name", token.Name, "mint_address", token.Address) // Use token.Address
			}

			if enriched == nil {
				slog.Error("EnrichCoinData returned nil without explicit error",
					"name", token.Name,
					"mint_address", token.Address) // Use token.Address
				return
			}

			// Add successfully (or partially) enriched coin
			mu.Lock()
			// IsTrending field has been removed - now using tags system only
			enrichedCoins = append(enrichedCoins, *enriched)
			mu.Unlock()
			slog.Info("Successfully processed enrichment", "name", enriched.Name, "address", enriched.Address)
		}(birdeyeToken) // Pass birdeyeToken to the goroutine
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
