package model

type OHLCVResponse struct {
	Data    OHLCVData `json:"data"`
	Success bool      `json:"success"`
}

type OHLCVData struct {
	Items []OHLCVItem `json:"items"`
}

type OHLCVItem struct {
	BaseAddress  string  `json:"base_address"`
	QuoteAddress string  `json:"quote_address"`
	O            float64 `json:"o"`
	H            float64 `json:"h"`
	L            float64 `json:"l"`
	C            float64 `json:"c"`
	VBase        float64 `json:"v_base"`
	Type         string  `json:"type"`
	UnixTime     int64   `json:"unix_time"`
}
