package model

import (
	"runtime"
	"sort"
	"strings"
	"time"
)

// Token represents a token in the system
type Token struct {
	MintAddress    string    `json:"mint_address"`
	Symbol         string    `json:"symbol"`
	Name           string    `json:"name"`
	Decimals       int32     `json:"decimals"`
	LogoURI        string    `json:"logo_uri"`
	CoingeckoID    string    `json:"coingecko_id,omitempty"`
	PriceUSD       float64   `json:"price_usd"`
	MarketCapUSD   float64   `json:"market_cap_usd"`
	Volume24h      float64   `json:"volume_24h"`
	PriceChange24h float64   `json:"price_change_24h"`
	LastUpdatedAt  time.Time `json:"last_updated_at"`
	Tags           []string  `json:"tags,omitempty"`
}

// GetID implements the Entity interface
func (t Token) GetID() string {
	return t.MintAddress
}

// FilterAndSortTokens filters and sorts a list of tokens based on the given criteria
func FilterAndSortTokens(tokens []Token, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) []Token {
	// Pre-allocate slice with estimated capacity
	filtered := make([]Token, 0, len(tokens))
	queryLower := strings.ToLower(query)

	// Convert tags to map for O(1) lookup
	tagSet := make(map[string]struct{}, len(tags))
	for _, tag := range tags {
		tagSet[tag] = struct{}{}
	}

	// Use channels for parallel processing if dataset is large
	if len(tokens) > 10000 {
		return filterAndSortParallel(tokens, queryLower, tagSet, minVolume24h, limit, offset, sortBy, sortDesc)
	}

	// Apply filters
	for i := range tokens { // Use index instead of copying in range
		token := &tokens[i] // Use pointer to avoid copying

		// Apply text search (short-circuit evaluation)
		if query != "" {
			nameLower := strings.ToLower(token.Name)
			symbolLower := strings.ToLower(token.Symbol)
			mintLower := strings.ToLower(token.MintAddress)

			if !strings.Contains(nameLower, queryLower) &&
				!strings.Contains(symbolLower, queryLower) &&
				!strings.Contains(mintLower, queryLower) {
				continue
			}
		}

		// Apply volume filter (fast numeric comparison)
		if minVolume24h > 0 && token.Volume24h < minVolume24h {
			continue
		}

		// Apply tags filter using map lookup
		if len(tagSet) > 0 {
			hasAllTags := true
			for _, tokenTag := range token.Tags {
				if _, exists := tagSet[tokenTag]; exists {
					// Found one required tag, no need to check others
					hasAllTags = true
					break
				}
				hasAllTags = false
			}
			if !hasAllTags {
				continue
			}
		}

		filtered = append(filtered, *token)
	}

	// Early return if no results after filtering
	if len(filtered) == 0 {
		return filtered
	}

	// Apply sorting (use pointers for faster swaps)
	sortTokens(filtered, sortBy, sortDesc)

	// Apply pagination
	return paginateResults(filtered, offset, limit)
}

// filterAndSortParallel handles parallel processing for large datasets
func filterAndSortParallel(tokens []Token, query string, tagSet map[string]struct{}, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) []Token {
	numWorkers := runtime.NumCPU()
	chunkSize := (len(tokens) + numWorkers - 1) / numWorkers
	results := make(chan []Token, numWorkers)

	// Process chunks in parallel
	for i := 0; i < numWorkers; i++ {
		start := i * chunkSize
		end := start + chunkSize
		if end > len(tokens) {
			end = len(tokens)
		}

		go func(chunk []Token) {
			filtered := make([]Token, 0, len(chunk))

			for j := range chunk {
				token := &chunk[j]

				// Apply text search
				if query != "" {
					nameLower := strings.ToLower(token.Name)
					symbolLower := strings.ToLower(token.Symbol)
					mintLower := strings.ToLower(token.MintAddress)

					if !strings.Contains(nameLower, query) &&
						!strings.Contains(symbolLower, query) &&
						!strings.Contains(mintLower, query) {
						continue
					}
				}

				// Apply volume filter
				if minVolume24h > 0 && token.Volume24h < minVolume24h {
					continue
				}

				// Apply tags filter
				if len(tagSet) > 0 {
					hasAllTags := false // Initialize to false
					for _, tokenTag := range token.Tags {
						if _, exists := tagSet[tokenTag]; exists {
							hasAllTags = true
							break
						}
					}
					if !hasAllTags {
						continue
					}
				}

				filtered = append(filtered, *token)
			}
			results <- filtered
		}(tokens[start:end])
	}

	// Collect results
	filtered := make([]Token, 0, len(tokens)) // Pre-allocate with capacity
	for i := 0; i < numWorkers; i++ {
		chunk := <-results
		filtered = append(filtered, chunk...)
	}

	// Sort combined results
	sortTokens(filtered, sortBy, sortDesc)

	// Apply pagination
	return paginateResults(filtered, offset, limit)
}

// sortTokens handles the sorting of tokens
func sortTokens(tokens []Token, sortBy string, sortDesc bool) {
	sort.Slice(tokens, func(i, j int) bool {
		var less bool
		switch sortBy {
		case "price_usd":
			less = tokens[i].PriceUSD < tokens[j].PriceUSD
		case "volume_24h":
			less = tokens[i].Volume24h < tokens[j].Volume24h
		case "market_cap_usd":
			less = tokens[i].MarketCapUSD < tokens[j].MarketCapUSD
		default:
			// Default sort by market cap
			less = tokens[i].MarketCapUSD < tokens[j].MarketCapUSD
		}
		if sortDesc {
			return !less
		}
		return less
	})
}

// paginateResults handles pagination of the results
func paginateResults(tokens []Token, offset, limit int32) []Token {
	if offset < 0 {
		offset = 0
	}
	if limit <= 0 {
		limit = 20
	}

	start := int(offset)
	if start >= len(tokens) {
		return []Token{}
	}

	end := int(offset + limit)
	if end > len(tokens) {
		end = len(tokens)
	}

	return tokens[start:end]
}
