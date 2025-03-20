package wallet

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
