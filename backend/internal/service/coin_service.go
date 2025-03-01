package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	dexscreenerBaseURL    = "https://api.dexscreener.com/latest/dex"
	dexscreenerProfileURL = "https://api.dexscreener.com/token-profiles/latest/v1"
	defaultLimit          = 50
)

// CoinService manages meme coin data in memory
type CoinService struct {
	client *http.Client
	mu     sync.RWMutex
	coins  map[string]model.MemeCoin // In-memory storage using contract address as key
}

// logf ensures logs are written to both stdout and the log file
func logf(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	log.Printf("%s\n", msg) // This will be captured in server.log
	// fmt.Print(msg)          // This will show in the terminal
}

// NewCoinService creates a new instance of CoinService and initializes hardcoded pairs
func NewCoinService() *CoinService {
	logf("🚀 Initializing CoinService...\n")
	service := &CoinService{
		client: &http.Client{Timeout: 10 * time.Second},
		coins:  make(map[string]model.MemeCoin),
	}

	// Initialize coins immediately
	now := time.Now()

	// Add base SOL token
	service.coins["So11111111111111111111111111111111111111112"] = model.MemeCoin{
		ID:              "So11111111111111111111111111111111111111112",
		Symbol:          "wSOL",
		Name:            "Wrapped SOL",
		Description:     "Wrapped SOL token for Solana DeFi",
		ContractAddress: "So11111111111111111111111111111111111111112",
		Price:           100.0,
		CurrentPrice:    100.0,
		Change24h:       1.0,
		Volume24h:       1000000.0,
		MarketCap:       10000000000.0,
		Supply:          10000000.0,
		Labels:          []string{"defi", "wrapped"},
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	logf("🪙 Added base SOL token\n")

	// Add USDC token
	service.coins["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"] = model.MemeCoin{
		ID:              "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
		Symbol:          "USDC",
		Name:            "USD Coin",
		Description:     "USD Coin on Solana",
		ContractAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
		Price:           1.0,
		CurrentPrice:    1.0,
		Change24h:       0.0,
		Volume24h:       5000000.0,
		MarketCap:       50000000000.0,
		Supply:          50000000000.0,
		Labels:          []string{"stablecoin", "usd"},
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	logf("💵 Added USDC token\n")

	// // Try to update prices from DexScreener immediately
	// logf("🔄 Updating prices from DexScreener...\n")
	// service.updatePricesFromDexScreener()

	// // Start a goroutine to periodically update prices from DexScreener
	// logf("⏰ Starting price updater goroutine...\n")
	// go service.startPriceUpdater()

	return service
}

// startPriceUpdater starts a goroutine that periodically updates prices from DexScreener
func (s *CoinService) startPriceUpdater() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		s.updatePricesFromDexScreener()
	}
}

// updatePricesFromDexScreener updates prices from DexScreener API
func (s *CoinService) updatePricesFromDexScreener() {
	logf("🔄 Updating prices from DexScreener...\n")
	logf("📊 DexScreener API: Starting batch price update for %d coins\n", len(s.coins))

	for addr, coin := range s.coins {
		if coin.Symbol == "wSOL" {
			continue // Skip wSOL as it's our base token
		}

		logf("🌐 DexScreener API: Fetching price for %s (%s) at address %s\n", coin.Name, coin.Symbol, addr)
		dexPair, err := s.fetchPairData(context.Background(), addr)
		if err != nil {
			logf("⚠️  DexScreener API Error: Failed to fetch price for %s: %v\n", coin.Symbol, err)
			continue
		}

		s.mu.Lock()
		oldPrice := coin.Price
		coin.Price = stringToFloat64(dexPair.PriceUsd)
		coin.PriceNative = dexPair.PriceNative
		coin.CurrentPrice = stringToFloat64(dexPair.PriceUsd)
		coin.Change24h = dexPair.PriceChange.H24
		coin.Volume24h = dexPair.Volume.H24
		coin.MarketCap = dexPair.MarketCap
		coin.Supply = dexPair.FDV / stringToFloat64(dexPair.PriceUsd)
		coin.DexID = dexPair.DexId
		coin.PairAddress = dexPair.PairAddress
		coin.PairCreatedAt = dexPair.PairCreatedAt

		// Map volume stats
		coin.Volume = model.VolumeStats{
			H24: dexPair.Volume.H24,
			H6:  dexPair.Volume.H6,
			H1:  dexPair.Volume.H1,
			M5:  dexPair.Volume.M5,
		}

		// Map price change stats
		coin.PriceChange = model.PriceChangeStats{
			H24: dexPair.PriceChange.H24,
			H6:  dexPair.PriceChange.H6,
			H1:  dexPair.PriceChange.H1,
			M5:  dexPair.PriceChange.M5,
		}

		// Map liquidity stats
		coin.Liquidity = model.LiquidityStats{
			USD:   dexPair.Liquidity.Usd,
			Base:  dexPair.Liquidity.Base,
			Quote: dexPair.Liquidity.Quote,
		}

		// Map transaction stats
		coin.Transactions.H24 = nil
		coin.Transactions.H6 = nil
		coin.Transactions.H1 = nil
		coin.Transactions.M5 = nil

		if dexPair.Txns.H24 != nil {
			coin.Transactions.H24 = &model.TransactionStats{
				Buys:  dexPair.Txns.H24.Buys,
				Sells: dexPair.Txns.H24.Sells,
			}
		}
		if dexPair.Txns.H6 != nil {
			coin.Transactions.H6 = &model.TransactionStats{
				Buys:  dexPair.Txns.H6.Buys,
				Sells: dexPair.Txns.H6.Sells,
			}
		}
		if dexPair.Txns.H1 != nil {
			coin.Transactions.H1 = &model.TransactionStats{
				Buys:  dexPair.Txns.H1.Buys,
				Sells: dexPair.Txns.H1.Sells,
			}
		}
		if dexPair.Txns.M5 != nil {
			coin.Transactions.M5 = &model.TransactionStats{
				Buys:  dexPair.Txns.M5.Buys,
				Sells: dexPair.Txns.M5.Sells,
			}
		}

		// Map boost active
		coin.BoostActive = dexPair.Boosts.Active

		// Map additional info
		if len(dexPair.Info.ImageURL) > 0 {
			coin.ImageURL = dexPair.Info.ImageURL
		}

		// Map websites
		coin.Websites = make([]model.Website, len(dexPair.Info.Websites))
		for i, website := range dexPair.Info.Websites {
			coin.Websites[i] = model.Website{URL: website.URL}
		}

		// Map socials
		coin.Socials = make([]model.SocialLink, len(dexPair.Info.Socials))
		for i, social := range dexPair.Info.Socials {
			coin.Socials[i] = model.SocialLink{
				Platform: social.Platform,
				Handle:   social.Handle,
			}
		}

		coin.UpdatedAt = time.Now()
		s.coins[addr] = coin
		s.mu.Unlock()

		logf("✅ DexScreener API: Updated %s price from %.8f to %.8f (Δ %.2f%%)\n",
			coin.Symbol,
			oldPrice,
			coin.Price,
			((coin.Price-oldPrice)/oldPrice)*100)
	}
	logf("✨ DexScreener API: Price update batch completed\n")
}

// GetTopMemeCoins returns the top meme coins by market cap
func (s *CoinService) GetTopMemeCoins(ctx context.Context, limit int) ([]model.MemeCoin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	logf("📊 Getting top meme coins (total coins in map: %d)\n", len(s.coins))
	var coins []model.MemeCoin
	for addr, coin := range s.coins {
		logf("🔍 Found coin %s (%s) at address %s with market cap %.2f\n", coin.Name, coin.Symbol, addr, coin.MarketCap)
		coins = append(coins, coin)
	}

	// Sort by market cap in descending order
	sort.Slice(coins, func(i, j int) bool {
		return coins[i].MarketCap > coins[j].MarketCap
	})

	// Return all coins if no limit is specified or if limit is greater than available coins
	if limit <= 0 || limit > len(coins) {
		logf("📈 Returning all %d coins\n", len(coins))
		return coins, nil
	}

	// Return the top N coins by market cap
	logf("📈 Returning top %d coins\n", limit)
	return coins[:limit], nil
}

// GetCoinByID returns a coin by its ID
func (s *CoinService) GetCoinByID(ctx context.Context, coinID string) (*model.MemeCoin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, coin := range s.coins {
		if coin.ID == coinID {
			return &coin, nil
		}
	}
	return nil, fmt.Errorf("coin not found")
}

// GetCoinByContractAddress returns a coin by its contract address
func (s *CoinService) GetCoinByContractAddress(ctx context.Context, contractAddress string) (*model.MemeCoin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if coin, exists := s.coins[contractAddress]; exists {
		return &coin, nil
	}
	return nil, fmt.Errorf("coin not found")
}

// GetCoinPriceHistory returns mock price history for a coin based on timeframe
func (s *CoinService) GetCoinPriceHistory(ctx context.Context, coinID string, timeframe string) ([]model.PricePoint, error) {
	coin, err := s.GetCoinByID(ctx, coinID)
	if err != nil {
		return nil, err
	}

	// Generate mock price history
	var points []model.PricePoint
	now := time.Now()
	basePrice := coin.Price
	numPoints := 24 // Default to 24 points

	switch timeframe {
	case "day":
		numPoints = 24
	case "week":
		numPoints = 7 * 24
	case "month":
		numPoints = 30 * 24
	default:
		return nil, fmt.Errorf("invalid timeframe: %s", timeframe)
	}

	for i := numPoints - 1; i >= 0; i-- {
		// Add some random variation to the price
		variation := basePrice * 0.1 * (float64(i) / float64(numPoints))
		price := basePrice + variation

		points = append(points, model.PricePoint{
			Timestamp: now.Add(-time.Duration(i) * time.Hour).Unix(),
			Price:     price,
		})
	}

	return points, nil
}

// UpdatePrices updates the prices of coins in memory
func (s *CoinService) UpdatePrices(ctx context.Context, updates []model.PriceUpdate) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, update := range updates {
		if coin, exists := s.coins[update.ContractAddress]; exists {
			coin.Price = update.Price
			coin.CurrentPrice = update.Price
			coin.Change24h = update.Change24h
			coin.Volume24h = update.Volume24h
			coin.MarketCap = update.MarketCap
			coin.UpdatedAt = time.Now()
			s.coins[update.ContractAddress] = coin
		}
	}
	return nil
}

// fetchPairData fetches data for a specific trading pair from DexScreener API
func (s *CoinService) fetchPairData(ctx context.Context, tokenAddress string) (*model.DexScreenerPair, error) {
	// Get the token symbol from our coins map
	s.mu.RLock()
	coin, exists := s.coins[tokenAddress]
	s.mu.RUnlock()
	if !exists {
		return nil, fmt.Errorf("token not found in local storage")
	}

	// Use the token symbol for searching
	url := fmt.Sprintf("https://api.dexscreener.com/latest/dex/search?q=%s", coin.Symbol)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pair data: %w", err)
	}
	defer resp.Body.Close()

	var response model.DexScreenerResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if response.Pairs == nil || len(response.Pairs) == 0 {
		return nil, fmt.Errorf("no pairs found for token %s", coin.Symbol)
	}

	// Track best USDC and SOL pairs separately
	var bestUSDCPair *model.DexScreenerPair
	var maxUSDCLiquidity float64
	var bestSOLPair *model.DexScreenerPair
	var maxSOLLiquidity float64

	// USDC and SOL addresses on Solana
	usdcAddress := "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	solAddress := "So11111111111111111111111111111111111111112"

	// Filter pairs to only include those matching our token symbol
	var validPairs []model.DexScreenerPair
	for i := range response.Pairs {
		pair := &response.Pairs[i]
		if strings.EqualFold(pair.BaseToken.Symbol, coin.Symbol) {
			validPairs = append(validPairs, *pair)
		}
	}

	if len(validPairs) == 0 {
		return nil, fmt.Errorf("no pairs found matching token symbol %s", coin.Symbol)
	}

	// Find best USDC and SOL pairs among valid pairs
	for i := range validPairs {
		pair := &validPairs[i]
		if pair.QuoteToken.Address == usdcAddress {
			if bestUSDCPair == nil || pair.Liquidity.Usd > maxUSDCLiquidity {
				bestUSDCPair = pair
				maxUSDCLiquidity = pair.Liquidity.Usd
			}
		} else if pair.QuoteToken.Address == solAddress {
			if bestSOLPair == nil || pair.Liquidity.Usd > maxSOLLiquidity {
				bestSOLPair = pair
				maxSOLLiquidity = pair.Liquidity.Usd
			}
		}
	}

	// Return the best pair based on our criteria:
	// 1. If we have a USDC pair, use it unless the SOL pair has significantly more liquidity (2x or more)
	// 2. Otherwise, fall back to the SOL pair if available
	if bestUSDCPair != nil {
		if bestSOLPair != nil && maxSOLLiquidity > maxUSDCLiquidity*2 {
			return bestSOLPair, nil
		}
		return bestUSDCPair, nil
	}
	if bestSOLPair != nil {
		return bestSOLPair, nil
	}

	return nil, fmt.Errorf("no matching pair found with USDC or SOL as quote token for %s", coin.Symbol)
}

// fetchTokenProfile fetches additional token information from DexScreener
func (s *CoinService) fetchTokenProfile(ctx context.Context, chainId, tokenAddress string) (*model.TokenProfile, error) {
	url := fmt.Sprintf("%s/%s/%s", dexscreenerProfileURL, chainId, tokenAddress)
	logf("🌐 DexScreener API Request: GET %s\n", url)

	startTime := time.Now()
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		logf("❌ DexScreener API Error: Failed to create request: %v\n", err)
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		logf("❌ DexScreener API Error: Request failed: %v\n", err)
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	duration := time.Since(startTime)
	logf("📥 DexScreener API Response: Status=%d, Duration=%.2fms\n",
		resp.StatusCode,
		float64(duration.Milliseconds()))

	if resp.StatusCode != http.StatusOK {
		logf("❌ DexScreener API Error: Non-200 status code: %d\n", resp.StatusCode)
		return nil, fmt.Errorf("error response from DexScreener (status %d)", resp.StatusCode)
	}

	var profile model.TokenProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		logf("❌ DexScreener API Error: Failed to parse JSON response: %v\n", err)
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	logf("✅ DexScreener API Success: Retrieved profile for token %s\n", tokenAddress)
	return &profile, nil
}

// GetPriceHistory returns price history for a coin (in-memory implementation)
func (s *CoinService) GetPriceHistory(ctx context.Context, coinID string, startTime time.Time) ([]model.PricePoint, error) {
	// For now, return empty slice since we're not storing historical data in memory
	return []model.PricePoint{}, nil
}

// Helper function to convert string to float64
func stringToFloat64(s string) float64 {
	if s == "" {
		return 0
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return f
}
