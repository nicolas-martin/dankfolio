package price

import (
	"time"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
)

// PriceHistory represents the response from the price history API
type PriceHistory struct {
	Data    PriceHistoryData `json:"data"`
	Success bool             `json:"success"`
}

// PriceHistoryData contains the price history items
type PriceHistoryData struct {
	Items []PriceHistoryItem `json:"items"`
}

// PriceHistoryItem represents a single price point
type PriceHistoryItem struct {
	UnixTime int64   `json:"unixTime"`
	Value    float64 `json:"value"`
}

// BackendTimeframeConfig defines the configuration for a specific timeframe for the backend.
type BackendTimeframeConfig struct {
	BirdeyeType         string        // e.g., "1m", "5m", "1H" for Birdeye API
	DefaultViewDuration time.Duration // Default duration window for this granularity, derived from frontend config
	Rounding            time.Duration // Rounding granularity in minutes, from frontend config
	HistoryType         string        // The type of history to fetch, e.g., "1H", "4H", "1D"
}

// TimeframeConfigMap Rounding is also used for CacheExpiry
var TimeframeConfigMap = map[pb.GetPriceHistoryRequest_PriceHistoryType]BackendTimeframeConfig{
	pb.GetPriceHistoryRequest_ONE_HOUR: {
		BirdeyeType:         "1m",
		DefaultViewDuration: 1 * time.Hour,
		Rounding:            2 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_HOUR)],
	},
	pb.GetPriceHistoryRequest_FOUR_HOUR: {
		BirdeyeType:         "5m",
		DefaultViewDuration: 4 * time.Hour,
		Rounding:            10 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_FOUR_HOUR)],
	},
	pb.GetPriceHistoryRequest_ONE_DAY: {
		BirdeyeType:         "15m",
		DefaultViewDuration: 24 * time.Hour,
		Rounding:            20 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_DAY)],
	},
	pb.GetPriceHistoryRequest_ONE_WEEK: {
		BirdeyeType:         "1H",
		DefaultViewDuration: 7 * 24 * time.Hour,
		Rounding:            120 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_WEEK)],
	},
	pb.GetPriceHistoryRequest_ONE_MONTH: {
		BirdeyeType:         "4H",
		DefaultViewDuration: 30 * 24 * time.Hour,
		Rounding:            480 * time.Minute, // 4 hours
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_MONTH)],
	},
}
