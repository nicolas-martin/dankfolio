package util

import "time"

// GetStartTimeForTimeframe returns the start time based on the given timeframe
func GetStartTimeForTimeframe(timeframe string) time.Time {
	now := time.Now()
	switch timeframe {
	case "day":
		return now.AddDate(0, 0, -1)
	case "week":
		return now.AddDate(0, 0, -7)
	case "month":
		return now.AddDate(0, -1, 0)
	case "year":
		return now.AddDate(-1, 0, 0)
	default:
		return now.AddDate(0, -1, 0)
	}
}
