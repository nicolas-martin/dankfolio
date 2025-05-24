package coin

import (
	"context"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// CoinServiceAPI defines the interface for coin related operations.
type CoinServiceAPI interface {
	GetCoinByID(ctx context.Context, id string) (*model.Coin, error)
	// Add other methods used by other services if necessary.
}
