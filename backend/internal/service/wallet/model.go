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

// WalletInfo has been removed for security reasons
// The server should never handle private keys or mnemonics
// Only public keys should be sent to and stored by the server

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

type TransferRequest struct {
	SignedTransaction   string `json:"signed_transaction"`
	UnsignedTransaction string `json:"unsigned_transaction"`
}
