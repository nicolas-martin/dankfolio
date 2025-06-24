package coin

import (
	"context"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	// pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1" // Removed if not used by other methods
)

// CoinServiceAPI defines the interface for coin related operations.
type CoinServiceAPI interface {
	GetCoinByID(ctx context.Context, id string) (*model.Coin, error)
	GetCoinByAddress(ctx context.Context, address string) (*model.Coin, error)
	GetCoinsByAddresses(ctx context.Context, addresses []string) ([]model.Coin, error)
	// Add other methods used by other services if necessary.
}
