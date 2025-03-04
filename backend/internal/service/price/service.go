package price

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

type Service struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewService() *Service {
	return &Service{
		baseURL:    "https://public-api.birdeye.so",
		apiKey:     os.Getenv("BIRDEYE_API_KEY"),
		httpClient: http.DefaultClient,
	}
}

type priceResponse struct {
	Data struct {
		Items []priceItem `json:"items"`
	} `json:"data"`
	Success bool `json:"success"`
}

type priceItem struct {
	Address  string  `json:"address"`
	O        float64 `json:"o"`
	H        float64 `json:"h"`
	L        float64 `json:"l"`
	C        float64 `json:"c"`
	V        float64 `json:"v"`
	Type     string  `json:"type"`
	UnixTime int64   `json:"unixTime"`
}

func (s *Service) GetOHLCV(ctx context.Context, baseAddress, quoteAddress, ohlcvType string, timeFrom, timeTo int64) (*model.OHLCVResponse, error) {
	// Use the token OHLCV endpoint for the base token
	url := fmt.Sprintf("%s/defi/ohlcv?address=%s&type=%s&time_from=%d&time_to=%d",
		s.baseURL, baseAddress, ohlcvType, timeFrom, timeTo)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add required headers
	req.Header.Set("accept", "application/json")
	req.Header.Set("x-chain", "solana")
	req.Header.Set("X-API-KEY", s.apiKey)
	req.Header.Set("User-Agent", "dankfolio/1.0")

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	var priceResp priceResponse
	if err := json.NewDecoder(resp.Body).Decode(&priceResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Convert price response to OHLCV response
	items := make([]model.OHLCVItem, len(priceResp.Data.Items))
	for i, item := range priceResp.Data.Items {
		items[i] = model.OHLCVItem{
			BaseAddress:  item.Address,
			QuoteAddress: quoteAddress,
			O:            item.O,
			H:            item.H,
			L:            item.L,
			C:            item.C,
			VBase:        item.V,
			Type:         item.Type,
			UnixTime:     item.UnixTime,
		}
	}

	return &model.OHLCVResponse{
		Data: model.OHLCVData{
			Items: items,
		},
		Success: priceResp.Success,
	}, nil
}
