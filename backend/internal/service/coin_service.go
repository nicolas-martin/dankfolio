package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
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
	fmt.Print(msg)          // This will show in the terminal
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

	// Add meme coins with fallback values
	memeCoins := []model.MemeCoin{
		{
			ID:              "BONK9vQy1JJ99sCGvwMqftdexYZ28UVJVgHe7F5bfmg",
			Symbol:          "BONK",
			Name:            "Bonk",
			Description:     "The first Solana dog coin for the people, by the people",
			ContractAddress: "BONK9vQy1JJ99sCGvwMqftdexYZ28UVJVgHe7F5bfmg",
			Price:           0.00001234,
			CurrentPrice:    0.00001234,
			Change24h:       0.0,
			Volume24h:       1000000,
			MarketCap:       500000000,
			Supply:          500000000 / 0.00001234,
			Labels:          []string{"meme", "solana"},
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
			Symbol:          "WIF",
			Name:            "Dogwifhat",
			Description:     "The Solana meme coin that started the dog with hat trend",
			ContractAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
			Price:           0.1234,
			CurrentPrice:    0.1234,
			Change24h:       0.0,
			Volume24h:       500000,
			MarketCap:       300000000,
			Supply:          300000000 / 0.1234,
			Labels:          []string{"meme", "solana"},
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              "METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL",
			Symbol:          "MYRO",
			Name:            "Myro",
			Description:     "The goodest boy on Solana",
			ContractAddress: "METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL",
			Price:           0.02345,
			CurrentPrice:    0.02345,
			Change24h:       0.0,
			Volume24h:       300000,
			MarketCap:       200000000,
			Supply:          200000000 / 0.02345,
			Labels:          []string{"meme", "solana"},
			CreatedAt:       now,
			UpdatedAt:       now,
		},
	}

	// Add meme coins
	logf("🪙 Adding meme coins...\n")
	for _, coin := range memeCoins {
		service.coins[coin.ContractAddress] = coin
		logf("✅ Added %s (%s) with price %.8f and market cap %.2f\n", coin.Name, coin.Symbol, coin.Price, coin.MarketCap)
	}

	logf("✨ Initialized %d coins in total\n", len(service.coins))

	// Try to update prices from DexScreener immediately
	logf("🔄 Updating prices from DexScreener...\n")
	service.updatePricesFromDexScreener()

	// Start a goroutine to periodically update prices from DexScreener
	logf("⏰ Starting price updater goroutine...\n")
	go service.startPriceUpdater()

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
		dexPair, err := s.fetchPairData(context.Background(), "solana", addr)
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
func (s *CoinService) fetchPairData(ctx context.Context, chainId, tokenAddr string) (*model.DexScreenerPair, error) {
	// Use the tokens endpoint for direct token lookup
	url := fmt.Sprintf("%s/tokens/%s", dexscreenerBaseURL, tokenAddr)
	logf("DexScreener Request: GET %s\n", url)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "MemeTrading/1.0")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch data from DexScreener: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	logf("DexScreener Response: %s\n", string(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("received non-200 status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var response struct {
		Pairs []model.DexScreenerPair `json:"pairs"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(response.Pairs) == 0 {
		return nil, fmt.Errorf("no pair data found")
	}

	// Find the Solana pair with the highest liquidity
	var bestPair *model.DexScreenerPair
	var maxLiquidity float64
	for i, pair := range response.Pairs {
		// Only consider Solana pairs
		if pair.ChainId != "solana" {
			continue
		}
		liquidity := pair.Liquidity.Usd
		if bestPair == nil || liquidity > maxLiquidity {
			maxLiquidity = liquidity
			bestPair = &response.Pairs[i]
		}
	}

	if bestPair == nil {
		return nil, fmt.Errorf("no matching Solana pair found")
	}

	return bestPair, nil
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
