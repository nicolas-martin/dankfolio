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
// It now filters out tokens with naughty names or descriptions.
func (s *Service) processBirdeyeTokens(ctx context.Context, tokensToEnrich []birdeye.TokenDetails) ([]model.Coin, error) {
	scrapeMaxConcurrentEnrich := 3
	slog.InfoContext(ctx, "Executing token enrichment with Birdeye data",
		slog.Int("token_count", len(tokensToEnrich)),
		slog.Int("concurrency", scrapeMaxConcurrentEnrich))

	enrichedCoinsResult := make([]model.Coin, 0, len(tokensToEnrich))
	var wg sync.WaitGroup
	var mu sync.Mutex // Protects enrichedCoinsResult
	sem := make(chan struct{}, scrapeMaxConcurrentEnrich)
	var encounteredErrors []error
	var errMu sync.Mutex // Mutex to protect encounteredErrors slice

	enrichPhaseTimeout := time.Duration(len(tokensToEnrich)*20) * time.Second
	enrichCtx, cancelEnrich := context.WithTimeout(ctx, enrichPhaseTimeout)
	defer cancelEnrich()

	for _, birdeyeTokenLoopVar := range tokensToEnrich {
		token := birdeyeTokenLoopVar // Capture range variable

		// Check name before starting goroutine and enrichment
		if s.containsNaughtyWord(token.Name) {
			slog.InfoContext(ctx, "Skipping token due to naughty name (pre-enrichment)",
				slog.String("name", token.Name),
				slog.String("address", token.Address))
			continue // Skip this token entirely
		}

		wg.Add(1)
		sem <- struct{}{}

		go func(currentToken birdeye.TokenDetails) { // Use currentToken which is a copy
			defer wg.Done()
			defer func() { <-sem }()

			enrichTaskCtx, enrichTaskCancel := context.WithTimeout(enrichCtx, 45*time.Second)
			defer enrichTaskCancel()

			slog.DebugContext(enrichTaskCtx, "Enriching token from Birdeye data", "name", currentToken.Name, "mint_address", currentToken.Address)

			enriched, err := s.EnrichCoinData(enrichTaskCtx, &currentToken) // Pass address of currentToken
			if err != nil {
				errMessage := fmt.Sprintf("Failed EnrichCoinData for %s (%s): %v", currentToken.Name, currentToken.Address, err)
				slog.ErrorContext(enrichTaskCtx, "Enrichment failed",
					slog.String("name", currentToken.Name),
					slog.String("mint_address", currentToken.Address),
					slog.Any("error", err))
				errMu.Lock()
				encounteredErrors = append(encounteredErrors, fmt.Errorf("%s", errMessage))
				errMu.Unlock()
				if enriched == nil {
					return
				}
				slog.WarnContext(enrichTaskCtx, "Adding partially enriched data despite error", "name", currentToken.Name, "mint_address", currentToken.Address)
			}

			if enriched == nil {
				slog.ErrorContext(enrichTaskCtx, "EnrichCoinData returned nil without explicit error",
					slog.String("name", currentToken.Name),
					slog.String("mint_address", currentToken.Address))
				return
			}

			// Check description after enrichment
			if s.containsNaughtyWord(enriched.Description) {
				slog.InfoContext(enrichTaskCtx, "Skipping token due to naughty description (post-enrichment)",
					slog.String("name", enriched.Name),
					slog.String("address", enriched.Address),
					slog.String("description_preview", enriched.Description[:min(len(enriched.Description), 100)]))
				return // Skip this token
			}

			mu.Lock()
			enrichedCoinsResult = append(enrichedCoinsResult, *enriched)
			mu.Unlock()
			slog.InfoContext(enrichTaskCtx, "Successfully processed and kept token after enrichment", "name", enriched.Name, "address", enriched.Address)
		}(token) // Pass the captured token to the goroutine
	}

	wg.Wait()
	close(sem)

	if len(encounteredErrors) > 0 {
		slog.WarnContext(ctx, "Enrichment finished with errors, proceeding with successfully enriched and non-naughty tokens",
			slog.Int("error_count", len(encounteredErrors)))
	}

	slog.InfoContext(ctx, "Enrichment summary",
		slog.Int("input_token_count", len(tokensToEnrich)),
		slog.Int("processed_and_kept_tokens", len(enrichedCoinsResult)),
		slog.Int("error_count", len(encounteredErrors)))

	return enrichedCoinsResult, nil
}
