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

//	export const TIMEFRAME_CONFIG: Record<string, { granularity: GetPriceHistoryRequest_PriceHistoryType, durationMs: number, roundingMinutes: number }> = {
//		"1H": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE, durationMs: 1 * 60 * 60 * 1000, roundingMinutes: 1 },
//		"4H": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE, durationMs: 4 * 60 * 60 * 1000, roundingMinutes: 5 },
//		"1D": { granularity: GetPriceHistoryRequest_PriceHistoryType.FIVE_MINUTE, durationMs: 24 * 60 * 60 * 1000, roundingMinutes: 10 },
//		"1W": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_HOUR, durationMs: 7 * 24 * 60 * 60 * 1000, roundingMinutes: 60 },
//		"1M": { granularity: GetPriceHistoryRequest_PriceHistoryType.FOUR_HOUR, durationMs: 30 * 24 * 60 * 60 * 1000, roundingMinutes: 240 }, // 4 hours
//		"1Y": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_DAY, durationMs: 365 * 24 * 60 * 60 * 1000, roundingMinutes: 1440 }, // 1 day
//		// Default for any other case, though UI should restrict to above
//		"DEFAULT": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE, durationMs: 4 * 60 * 60 * 1000, roundingMinutes: 1 },
//	};

var TimeframeConfigMap = map[pb.GetPriceHistoryRequest_PriceHistoryType]BackendTimeframeConfig{
	pb.GetPriceHistoryRequest_ONE_HOUR: {
		BirdeyeType:         "1H",
		DefaultViewDuration: 1 * time.Hour,
		Rounding:            1 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_HOUR)],
	},
	pb.GetPriceHistoryRequest_FOUR_HOUR: {
		BirdeyeType:         "4H",
		DefaultViewDuration: 4 * time.Hour,
		Rounding:            5 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_FOUR_HOUR)],
	},
	pb.GetPriceHistoryRequest_ONE_DAY: {
		BirdeyeType:         "1D",
		DefaultViewDuration: 24 * time.Hour,
		Rounding:            10 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_DAY)],
	},
	pb.GetPriceHistoryRequest_ONE_WEEK: {
		BirdeyeType:         "1W",
		DefaultViewDuration: 7 * 24 * time.Hour,
		Rounding:            60 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_WEEK)],
	},
}
