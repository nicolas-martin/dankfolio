package db

import (
	"context"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Store defines the interface for database operations
type Store interface {
	// Coin operations
	GetCoin(ctx context.Context, id string) (*model.Coin, error)
	ListCoins(ctx context.Context) ([]model.Coin, error)
	ListTrendingCoins(ctx context.Context) ([]model.Coin, error)
	UpsertCoin(ctx context.Context, coin *model.Coin) error
	DeleteCoin(ctx context.Context, id string) error

	// Trade operations
	GetTrade(ctx context.Context, id string) (*model.Trade, error)
	ListTrades(ctx context.Context) ([]*model.Trade, error)
	CreateTrade(ctx context.Context, trade *model.Trade) error
	UpdateTrade(ctx context.Context, trade *model.Trade) error
	DeleteTrade(ctx context.Context, id string) error
}
