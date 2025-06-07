package model

import "github.com/gagliardetto/solana-go/rpc"

// TransactionOptions mirrors rpc.TransactionOpts.
// PreflightCommitment will be a string like "confirmed", "finalized", etc.
// The client implementation will map this string to the actual rpc.CommitmentType.
type TransactionOptions struct {
	SkipPreflight       bool
	PreflightCommitment string
	MaxRetries          uint
}

// SignatureStatus mirrors fields from rpc.SignatureStatus.
// ConfirmationStatus will be a string like "processed", "confirmed", "finalized".
type SignatureStatus struct {
	Slot               uint64
	Confirmations      *uint64
	Err                interface{}
	ConfirmationStatus string
}

// SignatureStatusResult mirrors rpc.GetSignatureStatusesResult for our domain.
type SignatureStatusResult struct {
	Context struct {
		Slot uint64 `json:"slot"`
	} `json:"context"`
	Value []*SignatureStatus `json:"value"`
}

// Helper to convert model.CommitmentType string to rpc.CommitmentType
// This helper might be better placed in the client package where it's used,
// but defining it here for clarity of intent for now.
func ToRPCCommitment(commitment string) rpc.CommitmentType {
	switch commitment {
	case "processed":
		return rpc.CommitmentProcessed
	case "confirmed":
		return rpc.CommitmentConfirmed
	case "finalized":
		return rpc.CommitmentFinalized
	default:
		// Default to confirmed, or handle error appropriately in client
		return rpc.CommitmentConfirmed
	}
}

// GetTokenAccountsOptions mirrors relevant fields from rpc.GetTokenAccountsOpts
// and rpc.GetTokenAccountsConfig for use in the client interface.
// Encoding will be solana.EncodingType or string representation.
// Commitment is handled implicitly by specific interface methods (e.g., "Confirmed").
type GetTokenAccountsOptions struct {
	ProgramID string // Mint address or ProgramId as string
	Encoding  string // e.g., "jsonParsed", "base64"
}
