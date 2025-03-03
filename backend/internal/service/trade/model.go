package trade

// TradeQuote represents a quote for a trade
type TradeQuote struct {
	EstimatedAmount string   `json:"estimatedAmount"`
	ExchangeRate    string   `json:"exchangeRate"`
	Fee             TradeFee `json:"fee"`
}

// TradeFee represents the fee components for a trade
type TradeFee struct {
	Total  string `json:"total"`
	Spread string `json:"spread"`
	Gas    string `json:"gas"`
}

// CalculateTradeFee calculates the trade fee based on amount and price
func CalculateTradeFee(amount, price float64) float64 {
	// Simple fee calculation - in a real app this would be more complex
	baseFee := amount * 0.005 // 0.5% fee
	return baseFee
}
