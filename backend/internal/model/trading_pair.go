package model

type TradingPair struct {
	BaseCurrency  string `json:"base_currency"`
	QuoteCurrency string `json:"quote_currency"`
	MinAmount     string `json:"min_amount"`
	MaxAmount     string `json:"max_amount"`
	PriceScale    int    `json:"price_scale"`
	AmountScale   int    `json:"amount_scale"`
}
