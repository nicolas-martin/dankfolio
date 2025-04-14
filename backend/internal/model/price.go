package model

import "time"

// PriceHistoryResponse represents the response from the price history API
type PriceHistoryResponse struct {
	Data    PriceHistoryData `json:"data"`
	Success bool             `json:"success"`
}

// PriceHistoryData contains the price history items
type PriceHistoryData struct {
	Items []PriceHistoryItem `json:"items"`
}

// PriceHistoryItem represents a single price point
type PriceHistoryItem struct {
	UnixTime time.Time `json:"unix_time"`
	Value    float64   `json:"value"`
}

// PriceHistoryRequest represents a request for price history data
type PriceHistoryRequest struct {
	Address     string    `json:"address"`
	Type        string    `json:"type"`
	TimeFrom    time.Time `json:"time_from"`
	TimeTo      time.Time `json:"time_to"`
	AddressType string    `json:"address_type"`
}
