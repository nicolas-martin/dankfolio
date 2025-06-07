package blockchain

// Will be needed for interfaces later

// Address represents a generic blockchain address.
// For simplicity, using string. Could be a struct for more complex needs.
type Address string

// Signature represents a generic transaction signature.
// For simplicity, using string. Could be []byte.
type Signature string

// String returns the string representation of the signature
func (s Signature) String() string {
	return string(s)
}

// Blockhash represents a generic block hash.
type Blockhash string

// Balance represents a generic asset balance, including decimals/units.
type Balance struct {
	Amount         string  // Amount as a string to handle large numbers and various decimal precisions
	Decimals       uint8   // Number of decimal places for the token
	UIAmount       float64 // User-friendly amount (Amount / 10^Decimals)
	CurrencySymbol string  // e.g., "SOL", "ETH", "USDC" (Optional, might come from coin metadata)
}

// AccountInfo represents generic information about a blockchain account.
type AccountInfo struct {
	Address    Address // The address of the account
	Lamports   uint64  // Using Lamports as it's a common unit, can be generalized later if needed
	Owner      Address // Address of the program that owns this account
	Executable bool
	RentEpoch  uint64
	Data       []byte // Raw account data, could also be map[string]interface{} if parsed
}

// TokenAccountInfo represents generic information about a token account.
type TokenAccountInfo struct {
	Address     Address // Address of the token account itself
	MintAddress Address // Address of the token's mint
	Owner       Address // Address of the owner of this token account
	Amount      string  // Token amount as a string
	Decimals    uint8   // Decimals for this token
	UIAmount    float64 // User-friendly token amount
}

// TransactionInstruction represents a single instruction in a transaction.
type TransactionInstruction struct {
	ProgramID Address       // The program to execute
	Accounts  []AccountMeta // Accounts involved in the instruction
	Data      []byte        // Instruction data
}

// AccountMeta defines an account involved in an instruction.
type AccountMeta struct {
	Address    Address
	IsSigner   bool
	IsWritable bool
}

// Transaction represents a generic blockchain transaction.
type Transaction struct {
	Instructions    []TransactionInstruction
	FeePayer        Address
	RecentBlockhash Blockhash
	Signatures      []struct { // Generic signature structure if needed for multi-sig, etc.
		PublicKey Address   // Public key of the signer
		Signature Signature // The actual signature
	}
	// Alternatively, if transaction is already signed, it might be just a blob:
	// SignedRawTx []byte
}

// TransactionStatus represents the status of a transaction.
type TransactionStatus struct {
	Slot          uint64
	Confirmations *uint64   // Pointer to represent null or when not applicable
	Status        string    // e.g., "Unknown", "Pending", "Processed", "Confirmed", "Finalized", "Failed"
	Error         string    // Error message if the transaction failed (empty if successful)
	RawError      any       // Store original error object if needed
	Signature     Signature // The transaction signature

	// Additional fields for compatibility
	Confirmed bool  // Whether the transaction is confirmed
	Failed    bool  // Whether the transaction failed
	Err       error // Error object if the transaction failed
}

// TransactionOptions provides generic options for sending transactions.
type TransactionOptions struct {
	SkipPreflight       bool
	PreflightCommitment string // e.g., "processed", "confirmed", "finalized"
	MaxRetries          uint
	// Add other chain-agnostic options here if any
}

// TokenAccountsOptions provides generic options for fetching token accounts.
type TokenAccountsOptions struct {
	// If specific token mints are to be fetched for an owner, list them here.
	// MintFilter []Address
	// Encoding options if applicable and generic enough
	Encoding string // e.g., "jsonParsed", "base64" (though specific encodings vary by chain)
}

// PriceData represents generic price information for a token.
type PriceData struct {
	CurrencySymbol string  // e.g., "USDC", "SOL"
	Price          float64 // Price in terms of a quote currency (usually USD)
	VsCurrency     string  // The currency the price is quoted against (e.g., "USD")
}

// TradeQuote represents a generic quote for a swap.
type TradeQuote struct {
	InputToken               Address
	OutputToken              Address
	InputAmount              string  // Amount as string
	OutputAmount             string  // Amount as string
	EstimatedOutputAmountUIA float64 // User-friendly output amount
	FeeAmount                string  // Fee amount as string, in terms of a fee token
	FeeToken                 Address
	PriceImpactPct           float64
	Route                    string // Description of the trade route
	// Other generic fields like slippage, etc.
	RawQuote interface{} // To store chain-specific raw quote if needed for execution
}

// TokenMetadata represents generic metadata for a token/mint.
type TokenMetadata struct {
	Name      string
	Symbol    string
	URI       string                 // Link to off-chain JSON metadata often following a standard
	Decimals  uint8                  // Added, as this is crucial mint info often with metadata
	Supply    string                 // Total supply as a string
	OtherData map[string]interface{} // For any other chain-specific metadata
}
