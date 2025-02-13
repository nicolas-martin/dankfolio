package util

import (
	"strconv"
	"strings"
)

// ParseFloat64 converts a string to float64, handling various formats
// It removes any non-numeric characters except decimal points and negative signs
func ParseFloat64(s string) (float64, error) {
	// Remove any non-numeric characters except decimal points and negative signs
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}

	// Handle string numbers with K, M, B suffixes
	multiplier := 1.0
	if strings.HasSuffix(s, "K") || strings.HasSuffix(s, "k") {
		multiplier = 1000
		s = s[:len(s)-1]
	} else if strings.HasSuffix(s, "M") || strings.HasSuffix(s, "m") {
		multiplier = 1000000
		s = s[:len(s)-1]
	} else if strings.HasSuffix(s, "B") || strings.HasSuffix(s, "b") {
		multiplier = 1000000000
		s = s[:len(s)-1]
	}

	// Parse the numeric part
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}

	return val * multiplier, nil
}
