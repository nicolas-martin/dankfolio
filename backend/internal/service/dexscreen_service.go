package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

type DexScreenService struct {
	httpClient   *http.Client
	baseURL      string
	coinService  *CoinService
	wsService    *WebSocketService
	updateTicker *time.Ticker
	stopChan     chan struct{}
}

func NewDexScreenService(cs *CoinService, ws *WebSocketService) *DexScreenService {
	return &DexScreenService{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL:      "https://api.dexscreener.com/latest",
		coinService:  cs,
		wsService:    ws,
		updateTicker: time.NewTicker(30 * time.Second),
		stopChan:     make(chan struct{}),
	}
}

func (s *DexScreenService) Start(ctx context.Context) {
	go s.updateLoop(ctx)
}

func (s *DexScreenService) Stop() {
	s.updateTicker.Stop()
	close(s.stopChan)
}

type DexScreenResponse struct {
	Pairs []struct {
		ChainID     string `json:"chainId"`
		DexID       string `json:"dexId"`
		PairAddress string `json:"pairAddress"`
		BaseToken   struct {
			Address string `json:"address"`
			Name    string `json:"name"`
			Symbol  string `json:"symbol"`
		} `json:"baseToken"`
		QuoteToken struct {
			Symbol string `json:"symbol"`
		} `json:"quoteToken"`
		PriceUSD    string `json:"priceUsd"`
		Volume24h   string `json:"volume24h"`
		MarketCap   string `json:"marketCap"`
		PriceChange struct {
			H24 float64 `json:"h24"`
		} `json:"priceChange"`
	} `json:"pairs"`
}

func (s *DexScreenService) updateLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.stopChan:
			return
		case <-s.updateTicker.C:
			if err := s.fetchAndUpdatePrices(ctx); err != nil {
				// Log error
				continue
			}
		}
	}
}

func (s *DexScreenService) fetchAndUpdatePrices(ctx context.Context) error {
	// Fetch top meme coins from DexScreener
	resp, err := s.httpClient.Get(fmt.Sprintf("%s/dex/tokens/meme", s.baseURL))
	if err != nil {
		return fmt.Errorf("failed to fetch from dexscreener: %w", err)
	}
	defer resp.Body.Close()

	var dexResp DexScreenResponse
	if err := json.NewDecoder(resp.Body).Decode(&dexResp); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	// Process and update prices
	var updates []model.PriceUpdate
	for _, pair := range dexResp.Pairs {
		if pair.QuoteToken.Symbol != "USDT" && pair.QuoteToken.Symbol != "USDC" {
			continue
		}

		update := model.PriceUpdate{
			ContractAddress: pair.BaseToken.Address,
			Symbol:          pair.BaseToken.Symbol,
			Name:            pair.BaseToken.Name,
			Price:           mustParseFloat(pair.PriceUSD),
			Volume24h:       mustParseFloat(pair.Volume24h),
			MarketCap:       mustParseFloat(pair.MarketCap),
			PriceChange24h:  pair.PriceChange.H24,
			Timestamp:       time.Now(),
		}
		updates = append(updates, update)

		// Broadcast update via WebSocket
		s.wsService.BroadcastPriceUpdate(update)
	}

	// Update database
	if err := s.coinService.UpdatePrices(ctx, updates); err != nil {
		return fmt.Errorf("failed to update prices: %w", err)
	}

	return nil
}

func mustParseFloat(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}
