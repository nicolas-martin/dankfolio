package util

import (
	"context"
	"fmt"
	"log/slog"

	solanago "github.com/gagliardetto/solana-go"
	associatedtokenaccount "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/rpc"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

// ATAManager handles creation and management of Associated Token Accounts
type ATAManager struct {
	chainClient clients.GenericClientAPI
	rpcClient   *rpc.Client // For sending transactions
}

// NewATAManager creates a new ATA manager
func NewATAManager(chainClient clients.GenericClientAPI, rpcClient *rpc.Client) *ATAManager {
	return &ATAManager{
		chainClient: chainClient,
		rpcClient:   rpcClient,
	}
}

// EnsureATA checks if an ATA exists and creates it if necessary
// Returns the ATA address and whether it was created
func (m *ATAManager) EnsureATA(
	ctx context.Context,
	owner solanago.PublicKey,
	mint solanago.PublicKey,
	payer solanago.PrivateKey,
) (solanago.PublicKey, bool, error) {
	// Calculate ATA address
	ata, _, err := solanago.FindAssociatedTokenAddress(owner, mint)
	if err != nil {
		return solanago.PublicKey{}, false, fmt.Errorf("failed to calculate ATA: %w", err)
	}

	// Check if ATA exists
	if m.ATAExists(ctx, ata) {
		slog.Debug("ATA already exists", "owner", owner.String(), "mint", mint.String(), "ata", ata.String())
		return ata, false, nil
	}

	slog.Info("Creating ATA", "owner", owner.String(), "mint", mint.String(), "ata", ata.String())

	// Create ATA
	if err := m.CreateATA(ctx, owner, mint, payer); err != nil {
		return solanago.PublicKey{}, false, fmt.Errorf("failed to create ATA: %w", err)
	}

	return ata, true, nil
}

// ATAExists checks if an Associated Token Account exists on-chain
func (m *ATAManager) ATAExists(ctx context.Context, ataAddress solanago.PublicKey) bool {
	accountInfo, err := m.chainClient.GetAccountInfo(ctx, bmodel.Address(ataAddress.String()))
	if err != nil {
		slog.Debug("Failed to get ATA account info", "ata", ataAddress.String(), "error", err)
		return false
	}

	// Account exists if it's not nil and not owned by the system program (uninitialized)
	systemProgram := bmodel.Address(solanago.SystemProgramID.String())
	return accountInfo != nil && accountInfo.Owner != systemProgram
}

// CreateATA creates an Associated Token Account
func (m *ATAManager) CreateATA(
	ctx context.Context,
	owner solanago.PublicKey,
	mint solanago.PublicKey,
	payer solanago.PrivateKey,
) error {
	// Create instruction
	instruction := associatedtokenaccount.NewCreateInstruction(
		payer.PublicKey(), // payer
		owner,             // wallet (owner)
		mint,              // mint
	).Build()

	// Get recent blockhash
	recentBlockhash, err := m.chainClient.GetLatestBlockhash(ctx)
	if err != nil {
		return fmt.Errorf("failed to get blockhash: %w", err)
	}

	blockhash, err := solanago.HashFromBase58(string(recentBlockhash))
	if err != nil {
		return fmt.Errorf("failed to parse blockhash: %w", err)
	}

	// Build transaction
	tx, err := solanago.NewTransaction(
		[]solanago.Instruction{instruction},
		blockhash,
		solanago.TransactionPayer(payer.PublicKey()),
	)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	// Sign transaction
	_, err = tx.Sign(func(key solanago.PublicKey) *solanago.PrivateKey {
		if key == payer.PublicKey() {
			return &payer
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	txBytes, err := tx.MarshalBinary()
	if err != nil {
		return fmt.Errorf("failed to marshal transaction: %w", err)
	}

	sig, err := m.chainClient.SendRawTransaction(ctx, txBytes, bmodel.TransactionOptions{
		SkipPreflight:       false,
		PreflightCommitment: "confirmed",
	})
	if err != nil {
		return fmt.Errorf("failed to send transaction: %w", err)
	}

	slog.Info("ATA creation transaction sent",
		"signature", sig,
		"owner", owner.String(),
		"mint", mint.String())

	return nil
}

// CalculateATA calculates the Associated Token Account address for a given owner and mint
func CalculateATA(owner solanago.PublicKey, mint solanago.PublicKey) (solanago.PublicKey, error) {
	ata, _, err := solanago.FindAssociatedTokenAddress(owner, mint)
	if err != nil {
		return solanago.PublicKey{}, fmt.Errorf("failed to calculate ATA: %w", err)
	}
	return ata, nil
}

// CreateATAInstruction creates an instruction to create an ATA (for bundling with other transactions)
func CreateATAInstruction(
	payer solanago.PublicKey,
	owner solanago.PublicKey,
	mint solanago.PublicKey,
) solanago.Instruction {
	return associatedtokenaccount.NewCreateInstruction(
		payer, // payer
		owner, // wallet (owner)
		mint,  // mint
	).Build()
}