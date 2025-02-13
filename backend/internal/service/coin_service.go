package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/util"
)

const (
	dexscreenerBaseURL    = "https://api.dexscreener.com"
	dexscreenerProfileURL = "https://api.dexscreener.com/token-profiles/latest/v1"
	defaultLimit          = 50
)

// DexScreenerPair represents a trading pair from the DexScreener API
type DexScreenerPair struct {
	ChainId     string `json:"chainId"`
	DexId       string `json:"dexId"`
	PairAddress string `json:"pairAddress"`
	BaseToken   struct {
		Address string `json:"address"`
		Name    string `json:"name"`
		Symbol  string `json:"symbol"`
	} `json:"baseToken"`
	QuoteToken struct {
		Address string `json:"address"`
		Name    string `json:"name"`
		Symbol  string `json:"symbol"`
	} `json:"quoteToken"`
	PriceUsd string `json:"priceUsd"`
	Volume   struct {
		H24 float64 `json:"h24"`
	} `json:"volume"`
	PriceChange struct {
		H24 float64 `json:"h24"`
	} `json:"priceChange"`
	Liquidity struct {
		Usd float64 `json:"usd"`
	} `json:"liquidity"`
	PairCreatedAt int64   `json:"pairCreatedAt"`
	MarketCap     float64 `json:"marketCap"`
	Info          struct {
		ImageURL string `json:"imageUrl"`
		Websites []struct {
			URL string `json:"url"`
		} `json:"websites"`
		Socials []struct {
			Platform string `json:"platform"`
			Handle   string `json:"handle"`
		} `json:"socials"`
	} `json:"info"`
}

// DexScreenerResponse represents the response from the DexScreener API
type DexScreenerResponse struct {
	SchemaVersion string            `json:"schemaVersion"`
	Pairs         []DexScreenerPair `json:"pairs"`
}

// TokenProfile represents the response from DexScreener token profiles API
type TokenProfile struct {
	ChainId      string `json:"chainId"`
	TokenAddress string `json:"tokenAddress"`
	Icon         string `json:"icon"`
	Description  string `json:"description"`
	Links        []struct {
		Type  string `json:"type"`
		Label string `json:"label"`
		URL   string `json:"url"`
	} `json:"links"`
}

type CoinService struct {
	repo   repository.CoinRepository
	client *http.Client
}

func NewCoinService(repo repository.CoinRepository) *CoinService {
	return &CoinService{
		repo:   repo,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// fetchDexScreenerData fetches meme coin data from DexScreener API
func (s *CoinService) fetchDexScreenerData(ctx context.Context) ([]model.MemePair, error) {
	url := fmt.Sprintf("%s/latest/dex/search?q=solana", dexscreenerBaseURL)
	fmt.Printf("Fetching data from %s\n", url)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Printf("Error making request: %v\n", err)
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Error response from DexScreener (status %d): %s\n", resp.StatusCode, string(body))
		return nil, fmt.Errorf("error response from DexScreener (status %d)", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response body: %v\n", err)
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	fmt.Printf("Raw response: %s\n", string(body))

	var dexResp DexScreenerResponse
	if err := json.Unmarshal(body, &dexResp); err != nil {
		fmt.Printf("Error decoding response: %v\n", err)
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	fmt.Printf("Received %d pairs from DexScreener\n", len(dexResp.Pairs))

	var pairs []model.MemePair
	for _, dexPair := range dexResp.Pairs {
		if dexPair.QuoteToken.Symbol == "" {
			fmt.Printf("Skipping pair: Missing quote token information\n")
			continue
		}

		// Check for valid quote currency
		if !isValidQuoteCurrency(dexPair.QuoteToken.Symbol) {
			fmt.Printf("Skipping pair %s/%s: Invalid quote currency\n",
				dexPair.BaseToken.Symbol, dexPair.QuoteToken.Symbol)
			continue
		}

		// Check for minimum liquidity
		if dexPair.Liquidity.Usd < 10 { // Lower minimum liquidity for testing
			fmt.Printf("Skipping pair %s/%s: Low liquidity ($%.2f)\n",
				dexPair.BaseToken.Symbol, dexPair.QuoteToken.Symbol, dexPair.Liquidity.Usd)
			continue
		}

		// Check for minimum volume
		if dexPair.Volume.H24 < 10 { // Lower minimum volume for testing
			fmt.Printf("Skipping pair %s/%s: Low volume ($%.2f)\n",
				dexPair.BaseToken.Symbol, dexPair.QuoteToken.Symbol, dexPair.Volume.H24)
			continue
		}

		// Check if it's a meme coin based on name or symbol
		if isMemeCoin(dexPair.BaseToken.Name) || isMemeCoin(dexPair.BaseToken.Symbol) {
			fmt.Printf("Found meme coin %s/%s (name: %s)\n",
				dexPair.BaseToken.Symbol, dexPair.QuoteToken.Symbol, dexPair.BaseToken.Name)
			memePair := model.MemePair{
				BaseToken: struct {
					Address string `json:"address"`
					Name    string `json:"name"`
					Symbol  string `json:"symbol"`
				}{
					Address: dexPair.BaseToken.Address,
					Name:    dexPair.BaseToken.Name,
					Symbol:  dexPair.BaseToken.Symbol,
				},
				QuoteToken: struct {
					Address string `json:"address"`
					Name    string `json:"name"`
					Symbol  string `json:"symbol"`
				}{
					Address: dexPair.QuoteToken.Address,
					Name:    dexPair.QuoteToken.Name,
					Symbol:  dexPair.QuoteToken.Symbol,
				},
				PriceUsd:      dexPair.PriceUsd,
				Volume:        dexPair.Volume,
				PriceChange:   dexPair.PriceChange,
				Liquidity:     dexPair.Liquidity,
				PairCreatedAt: dexPair.PairCreatedAt,
				MarketCap:     dexPair.MarketCap,
			}
			pairs = append(pairs, memePair)
		} else {
			fmt.Printf("Skipping pair %s/%s: Not a meme coin\n",
				dexPair.BaseToken.Symbol, dexPair.QuoteToken.Symbol)
		}
	}

	fmt.Printf("Filtered to %d meme pairs\n", len(pairs))
	return pairs, nil
}

// filterMemePairs filters out non-meme coins based on certain criteria
func filterMemePairs(pairs []DexScreenerPair) []DexScreenerPair {
	var memePairs []DexScreenerPair
	for _, pair := range pairs {
		// Filter conditions for meme coins:
		// 1. Must be paired with a stablecoin (USDC, USDT) or SOL
		// 2. Must have some liquidity
		// 3. Must have some trading volume
		// 4. Must be a meme coin based on name/symbol or be a new token
		if isMemeCoinPair(pair) {
			memePairs = append(memePairs, pair)
		}
	}
	return memePairs
}

// isMemeCoinPair checks if a pair represents a meme coin
func isMemeCoinPair(pair DexScreenerPair) bool {
	// Check if paired with USDC, USDT, or SOL
	quoteCurrency := pair.QuoteToken.Symbol
	if !isValidQuoteCurrency(quoteCurrency) {
		fmt.Printf("Skipping pair %s/%s: Invalid quote currency\n", pair.BaseToken.Symbol, quoteCurrency)
		return false
	}

	// Check for minimum liquidity
	if pair.Liquidity.Usd < 10 { // Lower minimum liquidity for testing
		fmt.Printf("Skipping pair %s/%s: Low liquidity ($%.2f)\n",
			pair.BaseToken.Symbol, quoteCurrency, pair.Liquidity.Usd)
		return false
	}

	// Check for minimum volume
	if pair.Volume.H24 < 10 { // Lower minimum volume for testing
		fmt.Printf("Skipping pair %s/%s: Low volume ($%.2f)\n",
			pair.BaseToken.Symbol, quoteCurrency, pair.Volume.H24)
		return false
	}

	// Check if it's a meme coin based on name or symbol
	if isMemeCoin(pair.BaseToken.Name) || isMemeCoin(pair.BaseToken.Symbol) {
		fmt.Printf("Found meme coin %s/%s (name: %s)\n",
			pair.BaseToken.Symbol, quoteCurrency, pair.BaseToken.Name)
		return true
	}

	// Check if it's a new token (created in the last 30 days)
	if pair.PairCreatedAt > 0 {
		createdAt := time.UnixMilli(pair.PairCreatedAt)
		if time.Since(createdAt) < 30*24*time.Hour {
			fmt.Printf("Found new token %s/%s (created %s)\n",
				pair.BaseToken.Symbol, quoteCurrency, createdAt.Format("2006-01-02"))
			return true
		}
	}

	// Check for high price volatility
	if math.Abs(pair.PriceChange.H24) > 10 {
		fmt.Printf("Found volatile token %s/%s (24h change: %.2f%%)\n",
			pair.BaseToken.Symbol, quoteCurrency, pair.PriceChange.H24)
		return true
	}

	fmt.Printf("Skipping pair %s/%s: Not a meme coin\n",
		pair.BaseToken.Symbol, quoteCurrency)
	return false
}

// isValidQuoteCurrency checks if the quote currency is valid for meme coins
func isValidQuoteCurrency(symbol string) bool {
	// Clean up the symbol by removing any special characters and converting to uppercase
	cleanSymbol := strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsNumber(r) {
			return r
		}
		return -1
	}, symbol)
	cleanSymbol = strings.ToUpper(cleanSymbol)

	fmt.Printf("Checking quote currency: %s (cleaned: %s)\n", symbol, cleanSymbol)

	// List of valid quote currencies
	validQuotes := map[string]bool{
		"USDC":  true,
		"USDT":  true,
		"SOL":   true,
		"WSOL":  true,
		"WBNB":  true,
		"WPLS":  true,
		"ETH":   true,
		"WETH":  true,
		"BTC":   true,
		"WBTC":  true,
		"WNEAR": true,
		"BTCB":  true,
		"MOST":  true,
		"PUMP":  true,
		"TIRES": true,
		"PFF":   true,
		"BIAO":  true,
	}

	return validQuotes[cleanSymbol]
}

func (s *CoinService) GetTopMemeCoins(ctx context.Context, limit int) ([]model.MemeCoin, error) {
	pairs, err := s.fetchDexScreenerData(ctx)
	if err != nil {
		return nil, fmt.Errorf("error fetching meme coin data: %w", err)
	}

	// Sort pairs by volume
	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].Volume.H24 > pairs[j].Volume.H24
	})

	// Take top N pairs
	if len(pairs) > limit {
		pairs = pairs[:limit]
	}

	// Convert to MemeCoin objects
	var coins []model.MemeCoin
	for _, pair := range pairs {
		coin := model.MemeCoin{
			ID:              pair.BaseToken.Address,
			Symbol:          pair.BaseToken.Symbol,
			Name:            pair.BaseToken.Name,
			Description:     fmt.Sprintf("Meme coin trading on %s", pair.DexId),
			ContractAddress: pair.BaseToken.Address,
			Price:           pair.Volume.H24,
			CurrentPrice:    pair.Volume.H24,
			Change24h:       pair.PriceChange.H24,
			Volume24h:       pair.Volume.H24,
			MarketCap:       pair.MarketCap,
			Supply:          pair.MarketCap / pair.Volume.H24,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		coins = append(coins, coin)
	}

	return coins, nil
}

func (s *CoinService) GetPriceHistory(ctx context.Context, coinID string, startTime time.Time) ([]model.PricePoint, error) {
	return s.repo.GetPriceHistory(ctx, coinID, startTime)
}

func (s *CoinService) UpdatePrices(ctx context.Context, updates []model.PriceUpdate) error {
	return s.repo.UpdatePrices(ctx, updates)
}

func (s *CoinService) GetCoinByID(ctx context.Context, coinID string) (*model.MemeCoin, error) {
	return s.repo.GetCoinByID(ctx, coinID)
}

func (s *CoinService) GetCoinPriceHistory(ctx context.Context, coinID string, timeframe string) ([]model.PricePoint, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)
	endTime := time.Now()

	return s.repo.GetCoinPriceHistory(ctx, coinID, startTime, endTime)
}

// fetchSpecificPair fetches data for a specific trading pair from DexScreener API
func (s *CoinService) fetchSpecificPair(ctx context.Context, contractAddress string) (*DexScreenerPair, error) {
	// DexScreener API endpoint for specific pair by token address
	url := fmt.Sprintf("%s/latest/dex/tokens/%s", dexscreenerBaseURL, contractAddress)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch data from DexScreener: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code from DexScreener: %d, body: %s", resp.StatusCode, string(body))
	}

	var dexResp DexScreenerResponse
	if err := json.NewDecoder(resp.Body).Decode(&dexResp); err != nil {
		return nil, fmt.Errorf("failed to decode DexScreener response: %w", err)
	}

	// Find the best pair for the token (highest liquidity on Solana)
	var bestPair *DexScreenerPair
	var maxLiquidity float64

	for i, pair := range dexResp.Pairs {
		// Only consider Solana pairs
		if pair.ChainId != "solana" {
			continue
		}

		// Only consider pairs with valid quote currencies
		if !isValidQuoteCurrency(pair.QuoteToken.Symbol) {
			continue
		}

		if pair.Liquidity.Usd > maxLiquidity {
			maxLiquidity = pair.Liquidity.Usd
			bestPair = &dexResp.Pairs[i]
		}
	}

	if bestPair == nil {
		return nil, fmt.Errorf("no valid trading pair found for token: %s", contractAddress)
	}

	return bestPair, nil
}

// fetchTokenProfile fetches additional token information from DexScreener
func (s *CoinService) fetchTokenProfile(ctx context.Context, chainId, tokenAddress string) (*TokenProfile, error) {
	url := fmt.Sprintf("%s/%s/%s", dexscreenerProfileURL, chainId, tokenAddress)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error response from DexScreener (status %d)", resp.StatusCode)
	}

	var profile TokenProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &profile, nil
}

// GetCoinByContractAddress fetches detailed information about a specific coin by its contract address
func (s *CoinService) GetCoinByContractAddress(ctx context.Context, contractAddress string) (*model.MemeCoin, error) {
	pair, err := s.fetchSpecificPair(ctx, contractAddress)
	if err != nil {
		return nil, fmt.Errorf("error fetching pair data: %w", err)
	}

	// Fetch additional token profile information
	profile, err := s.fetchTokenProfile(ctx, pair.ChainId, pair.BaseToken.Address)
	if err != nil {
		// Log the error but continue without profile data
		fmt.Printf("Warning: Could not fetch token profile: %v\n", err)
	}

	price, _ := util.ParseFloat64(pair.PriceUsd)
	coin := &model.MemeCoin{
		ID:              pair.BaseToken.Address,
		Symbol:          pair.BaseToken.Symbol,
		Name:            pair.BaseToken.Name,
		ContractAddress: pair.BaseToken.Address,
		Price:           price,
		CurrentPrice:    price,
		Change24h:       pair.PriceChange.H24,
		Volume24h:       pair.Volume.H24,
		MarketCap:       pair.MarketCap,
		Supply:          pair.MarketCap / price,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Add profile information if available
	if profile != nil {
		coin.Description = profile.Description
		coin.LogoURL = profile.Icon
	}

	// Use pair info as fallback for logo URL
	if coin.LogoURL == "" && pair.Info.ImageURL != "" {
		coin.LogoURL = pair.Info.ImageURL
	}

	// Add website URL if available from pair info
	if len(pair.Info.Websites) > 0 {
		coin.WebsiteURL = pair.Info.Websites[0].URL
	}

	// If no description from profile, create one from available info
	if coin.Description == "" {
		var socials []string
		for _, social := range pair.Info.Socials {
			socials = append(socials, fmt.Sprintf("%s: %s", social.Platform, social.Handle))
		}

		description := fmt.Sprintf("Trading on %s", pair.DexId)
		if len(socials) > 0 {
			description += fmt.Sprintf(". Social links: %s", strings.Join(socials, ", "))
		}
		coin.Description = description
	}

	return coin, nil
}

func isMemeCoin(text string) bool {
	// Convert to lowercase for case-insensitive matching
	text = strings.ToLower(text)

	// List of common meme coin indicators
	memeIndicators := []string{
		"doge", "shib", "inu", "elon", "moon", "safe", "cum", "chad",
		"pepe", "wojak", "fren", "kek", "pamp", "dump", "gm", "gn",
		"lfg", "ngmi", "wagmi", "fud", "cope", "ponzi", "moon", "mars",
		"pluto", "jupiter", "saturn", "galaxy", "star", "rocket",
		"diamond", "hands", "paper", "hodl", "hold", "buy", "sell",
		"bear", "bull", "pump", "dump", "green", "red", "chart", "dex",
		"swap", "yield", "farm", "pool", "stake", "mine", "burn", "lock",
		"vault", "safe", "gem", "coin", "token", "nft", "meta", "dao",
		"defi", "web3", "ai", "bot", "oracle", "chain", "block",
		"cat", "dog", "frog", "shark", "fish", "bird", "monkey", "ape",
		"baby", "daddy", "king", "queen", "prince", "lord", "god",
		"meme", "joke", "fun", "play", "game", "win", "rich", "poor",
		"lambo", "yacht", "based", "cringe", "sigma", "alpha", "beta",
		"gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota",
		"kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho",
		"sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
	}

	// Check if the text contains any meme indicators
	for _, indicator := range memeIndicators {
		if strings.Contains(text, indicator) {
			return true
		}
	}

	return false
}

func (s *CoinService) FetchAndStoreRealMemeCoins(ctx context.Context) error {
	pairs, err := s.fetchDexScreenerData(ctx)
	if err != nil {
		return fmt.Errorf("error fetching meme coin data: %w", err)
	}

	var updates []model.PriceUpdate
	now := time.Now()

	for _, pair := range pairs {
		price, _ := util.ParseFloat64(pair.PriceUsd)

		update := model.PriceUpdate{
			CoinID:          pair.BaseToken.Address,
			ContractAddress: pair.BaseToken.Address,
			Symbol:          pair.BaseToken.Symbol,
			Name:            pair.BaseToken.Name,
			Price:           price,
			Volume24h:       pair.Volume.H24,
			MarketCap:       pair.MarketCap,
			PriceChange24h:  pair.PriceChange.H24,
			Timestamp:       now,
		}
		updates = append(updates, update)
	}

	err = s.repo.UpdatePrices(ctx, updates)
	if err != nil {
		return fmt.Errorf("failed to store price updates: %w", err)
	}

	return nil
}
