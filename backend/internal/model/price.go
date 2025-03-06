package model

type PriceHistoryItem struct {
	UnixTime int64   `json:"unixTime"`
	Value    float64 `json:"value"`
}

type PriceHistoryResponse struct {
	Data struct {
		Items []PriceHistoryItem `json:"items"`
	} `json:"data"`
	Success bool `json:"success"`
}
