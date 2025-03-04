package price

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

type Service struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewService(apiKey string) *Service {
	return &Service{
		baseURL:    "https://public-api.birdeye.so",
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// validTypes is a map of valid history types
var validTypes = map[string]bool{
	"1m": true, "3m": true, "5m": true, "15m": true, "30m": true,
	"1H": true, "2H": true, "4H": true, "6H": true, "8H": true, "12H": true,
	"1D": true, "3D": true, "1W": true, "1M": true,
}

func (s *Service) GetPriceHistory(ctx context.Context, address string, historyType string, timeFrom, timeTo int64, addressType string) (*model.PriceHistoryResponse, error) {
	if address == "" {
		return nil, errors.New("address is required")
	}

	// Validate history type
	if historyType != "" {
		if _, ok := validTypes[historyType]; !ok {
			return nil, fmt.Errorf("invalid history type: %s. Valid types are: %s", historyType, strings.Join(getValidTypeKeys(), ", "))
		}
	}

	// Validate time range
	if timeFrom > 0 && timeTo > 0 && timeFrom >= timeTo {
		return nil, errors.New("time_from must be less than time_to")
	}

	url := fmt.Sprintf("%s/defi/history_price?address=%s&address_type=%s&type=%s&time_from=%d&time_to=%d",
		s.baseURL,
		address,
		addressType,
		historyType,
		timeFrom,
		timeTo,
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("x-chain", "solana")
	req.Header.Set("X-API-KEY", s.apiKey)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	var priceHistory model.PriceHistoryResponse
	if err := json.NewDecoder(resp.Body).Decode(&priceHistory); err != nil {
		return nil, fmt.Errorf("error unmarshalling response: %w", err)
	}

	return &priceHistory, nil
}

func getValidTypeKeys() []string {
	keys := make([]string, 0, len(validTypes))
	for k := range validTypes {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
