package price

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

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

func (s *Service) GetPriceHistory(ctx context.Context, address string, historyType string, timeFrom, timeTo int64, addressType string) (*model.PriceHistoryResponse, error) {
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
