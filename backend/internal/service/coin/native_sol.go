package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// ensureNativeSolCoin ensures that native SOL coin exists in the database with proper data
func (s *Service) ensureNativeSolCoin(ctx context.Context) error {
	// Check if native SOL already exists
	existingNativeSol, err := s.store.Coins().GetByField(ctx, "address", model.NativeSolMint)
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		return fmt.Errorf("error checking for existing native SOL: %w", err)
	}

	// Get wSOL data to copy price information
	wsolCoin, err := s.store.Coins().GetByField(ctx, "address", model.SolMint)
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		return fmt.Errorf("error fetching wSOL coin: %w", err)
	}

	// If wSOL doesn't exist, try to fetch it from Birdeye
	if wsolCoin == nil {
		slog.Info("wSOL not found, fetching from Birdeye...")
		wsolCoin, err = s.GetCoinByAddress(ctx, model.SolMint)
		if err != nil {
			slog.Warn("Failed to fetch wSOL from Birdeye, will create native SOL with default values", "error", err)
			// Create with default values if we can't get wSOL data
			wsolCoin = &model.Coin{
				Price:     0.0,
				LogoURI:   "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
			}
		}
	}

	if existingNativeSol != nil {
		// Check if existing native SOL has all required fields
		needsUpdate := false
		if existingNativeSol.Name == "" || existingNativeSol.Symbol == "" || existingNativeSol.Decimals != 9 {
			slog.Warn("Native SOL missing required fields, will update", 
				"name", existingNativeSol.Name, 
				"symbol", existingNativeSol.Symbol, 
				"decimals", existingNativeSol.Decimals)
			needsUpdate = true
			existingNativeSol.Name = "Solana"
			existingNativeSol.Symbol = "SOL"
			existingNativeSol.Decimals = 9
			existingNativeSol.Description = "Native Solana token"
		}
		
		// Always update price data and logo
		slog.Info("Updating existing native SOL with current price data...")
		existingNativeSol.Price = wsolCoin.Price
		existingNativeSol.Price24hChangePercent = wsolCoin.Price24hChangePercent
		existingNativeSol.Marketcap = wsolCoin.Marketcap
		existingNativeSol.Volume24hUSD = wsolCoin.Volume24hUSD
		existingNativeSol.Volume24hChangePercent = wsolCoin.Volume24hChangePercent
		existingNativeSol.Liquidity = wsolCoin.Liquidity
		existingNativeSol.FDV = wsolCoin.FDV
		existingNativeSol.Rank = wsolCoin.Rank
		existingNativeSol.LastUpdated = time.Now().Format(time.RFC3339)
		
		// Update logo if missing
		if existingNativeSol.LogoURI == "" && wsolCoin.LogoURI != "" {
			existingNativeSol.LogoURI = wsolCoin.LogoURI
			needsUpdate = true
		}
		
		if err := s.store.Coins().Update(ctx, existingNativeSol); err != nil {
			return fmt.Errorf("failed to update native SOL: %w", err)
		}
		slog.Info("Native SOL updated successfully", 
			"price", existingNativeSol.Price,
			"name", existingNativeSol.Name,
			"symbol", existingNativeSol.Symbol,
			"needsUpdate", needsUpdate)
		return nil
	}

	// Create native SOL coin
	slog.Info("Creating native SOL coin...")
	nativeSol := &model.Coin{
		Address:                model.NativeSolMint,
		Name:                   "Solana",
		Symbol:                 "SOL",
		Decimals:               9,
		Description:            "Native Solana token",
		LogoURI:                wsolCoin.LogoURI,
		Price:                  wsolCoin.Price,
		Price24hChangePercent:  wsolCoin.Price24hChangePercent,
		Marketcap:              wsolCoin.Marketcap,
		Volume24hUSD:           wsolCoin.Volume24hUSD,
		Volume24hChangePercent: wsolCoin.Volume24hChangePercent,
		Liquidity:              wsolCoin.Liquidity,
		FDV:                    wsolCoin.FDV,
		Rank:                   wsolCoin.Rank,
		Website:                wsolCoin.Website,
		Twitter:                wsolCoin.Twitter,
		CreatedAt:              time.Now().Format(time.RFC3339),
		LastUpdated:            time.Now().Format(time.RFC3339),
		Tags:                   []string{"native", "sol"},
	}

	if err := s.store.Coins().Create(ctx, nativeSol); err != nil {
		return fmt.Errorf("failed to create native SOL coin: %w", err)
	}

	slog.Info("Native SOL coin created successfully", "price", nativeSol.Price)
	return nil
}

// getNativeSolCoin retrieves native SOL coin, ensuring it exists and has current price
func (s *Service) getNativeSolCoin(ctx context.Context) (*model.Coin, error) {
	// First try to get from database
	coin, err := s.store.Coins().GetByField(ctx, "address", model.NativeSolMint)
	if err == nil && coin != nil {
		// Check if price data is fresh
		if s.isCoinMarketDataFresh(coin) {
			return coin, nil
		}
		// Update with fresh wSOL price
		return s.updateNativeSolPrice(ctx, coin)
	}

	// If not found, ensure it exists
	if err := s.ensureNativeSolCoin(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure native SOL exists: %w", err)
	}

	// Try to get again
	coin, err = s.store.Coins().GetByField(ctx, "address", model.NativeSolMint)
	if err != nil {
		return nil, fmt.Errorf("failed to get native SOL after creation: %w", err)
	}
	return coin, nil
}

// updateNativeSolPrice updates native SOL with current wSOL price
func (s *Service) updateNativeSolPrice(ctx context.Context, nativeSol *model.Coin) (*model.Coin, error) {
	// Ensure basic fields are set
	if nativeSol.Name == "" || nativeSol.Symbol == "" || nativeSol.Decimals != 9 {
		slog.Warn("Native SOL missing required fields during price update, fixing", 
			"name", nativeSol.Name, 
			"symbol", nativeSol.Symbol, 
			"decimals", nativeSol.Decimals)
		nativeSol.Name = "Solana"
		nativeSol.Symbol = "SOL"
		nativeSol.Decimals = 9
		nativeSol.Description = "Native Solana token"
	}

	// Get current wSOL price
	wsolCoin, err := s.store.Coins().GetByField(ctx, "address", model.SolMint)
	if err != nil {
		// Try to fetch from Birdeye
		wsolCoin, err = s.GetCoinByAddress(ctx, model.SolMint)
		if err != nil {
			slog.Warn("Failed to get wSOL price for native SOL update", "error", err)
			return nativeSol, nil // Return stale data rather than failing
		}
	}

	// Update native SOL with wSOL market data
	nativeSol.Price = wsolCoin.Price
	nativeSol.Price24hChangePercent = wsolCoin.Price24hChangePercent
	nativeSol.Marketcap = wsolCoin.Marketcap
	nativeSol.Volume24hUSD = wsolCoin.Volume24hUSD
	nativeSol.Volume24hChangePercent = wsolCoin.Volume24hChangePercent
	nativeSol.Liquidity = wsolCoin.Liquidity
	nativeSol.FDV = wsolCoin.FDV
	nativeSol.Rank = wsolCoin.Rank
	nativeSol.LastUpdated = time.Now().Format(time.RFC3339)
	
	// Update logo if missing
	if nativeSol.LogoURI == "" && wsolCoin.LogoURI != "" {
		nativeSol.LogoURI = wsolCoin.LogoURI
	}

	if err := s.store.Coins().Update(ctx, nativeSol); err != nil {
		slog.Warn("Failed to update native SOL price", "error", err)
		// Return updated coin even if DB update fails
	}

	return nativeSol, nil
}