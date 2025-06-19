package trade

// PrepareSwapRequestData holds the parameters for a PrepareSwap operation.
type PrepareSwapRequestData struct {
	FromCoinMintAddress string
	ToCoinMintAddress   string
	InputAmount         string
	SlippageBps         string
	FromAddress         string // User's wallet public key
}

// TradeQuote represents a quote for a trade
type TradeQuote struct {
	EstimatedAmount string   `json:"estimatedAmount"`
	ExchangeRate    string   `json:"exchangeRate"`
	Fee             string   `json:"fee"` // Trading fees in USD (legacy)
	PriceImpact     string   `json:"priceImpact"`
	RoutePlan       []string `json:"routePlan"`
	InputMint       string   `json:"inputMint"`
	OutputMint      string   `json:"outputMint"`
	Raw             []byte   `json:"-"` // Full raw quote response for Jupiter swap

	// Enhanced SOL fee breakdown
	SolFeeBreakdown  *SolFeeBreakdown `json:"solFeeBreakdown,omitempty"`
	TotalSolRequired string           `json:"totalSolRequired"` // Total SOL needed for transaction
	TradingFeeSol    string           `json:"tradingFeeSol"`    // Trading fees in SOL
}

// SolFeeBreakdown provides detailed breakdown of all SOL costs
type SolFeeBreakdown struct {
	TradingFee         string `json:"tradingFee"`         // Route + platform fees in SOL
	TransactionFee     string `json:"transactionFee"`     // Basic transaction cost
	AccountCreationFee string `json:"accountCreationFee"` // ATA creation costs
	PriorityFee        string `json:"priorityFee"`        // Transaction prioritization fee
	Total              string `json:"total"`              // Sum of all SOL fees
	AccountsToCreate   int    `json:"accountsToCreate"`   // Number of ATAs to create
}

// TradeFee represents the fee components for a trade
type TradeFee struct {
	Total          string `json:"total"`
	PriceImpactPct string `json:"priceImpactPct"`
	Gas            string `json:"gas,omitempty"`
}

// CalculateTradeFee calculates the trade fee based on amount and price
func CalculateTradeFee(amount, price float64) float64 {
	// Simple fee calculation - in a real app this would be more complex
	baseFee := amount * 0.005 // 0.5% fee
	return baseFee
}
