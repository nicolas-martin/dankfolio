package wallet

// Balance represents information about a token balance
type Balance struct {
	ID     string  `json:"id"`
	Amount float64 `json:"amount"`
}

// WalletBalance represents a wallet's complete balance
type WalletBalance struct {
	Balances []Balance `json:"balances"`
}

// WalletInfo represents a wallet's public and private keys
type WalletInfo struct {
	PublicKey string `json:"public_key"`
	SecretKey string `json:"secret_key"`
}

// Parse the JSON data into our struct
var parsedAccount struct {
	Program string `json:"program"`
	Parsed  struct {
		Info struct {
			Mint        string `json:"mint"`
			TokenAmount struct {
				Amount   string  `json:"amount"`
				Decimals uint8   `json:"decimals"`
				UiAmount float64 `json:"uiAmount"`
			} `json:"tokenAmount"`
		} `json:"info"`
		Type string `json:"type"`
	} `json:"parsed"`
}
