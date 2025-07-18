package wallet

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	bin "github.com/gagliardetto/binary"
	"github.com/gagliardetto/solana-go"
	associatedtokenaccount "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/google/uuid"
	"github.com/tyler-smith/go-bip39"

	bclient "github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin" // Added for CoinServiceAPI
)

// Service handles wallet-related operations
type Service struct {
	chainClient bclient.GenericClientAPI // Use generic blockchain client interface
	store       db.Store
	coinService coin.CoinServiceAPI // Added CoinService
}

// New creates a new wallet service
func New(chainClient bclient.GenericClientAPI, store db.Store, coinService coin.CoinServiceAPI) *Service { // Accept generic client
	return &Service{
		chainClient: chainClient,
		store:       store,
		coinService: coinService, // Store injected CoinService
	}
}

// parseAddress safely parses a Solana address and logs the result
func (s *Service) parseAddress(address, label string) (solana.PublicKey, error) {
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		slog.Error("Invalid address", "label", label, "error", err)
		return solana.PublicKey{}, fmt.Errorf("invalid %s address: %w", label, err)
	}
	slog.Debug("Address parsed", "label", label, "address", pubKey.String())
	return pubKey, nil
}

// getOrCreateATA gets an Associated Token Account, creating it if it doesn't exist
func (s *Service) getOrCreateATA(ctx context.Context, payer, owner, mint solana.PublicKey) (solana.PublicKey, []solana.Instruction, error) {
	ata, _, err := solana.FindAssociatedTokenAddress(owner, mint)
	if err != nil {
		return solana.PublicKey{}, nil, fmt.Errorf("failed to find token account: %w", err)
	}

	// Use generic GetAccountInfo
	bAccInfo, err := s.chainClient.GetAccountInfo(ctx, bmodel.Address(ata.String()))
	var instructions []solana.Instruction

	if err != nil {
		if errors.Is(err, bclient.ErrAccountNotFound) { // Ensure bclient or your chosen alias is used
			slog.Debug("Token account not found by chainClient.GetAccountInfo, planning creation", "address", ata.String(), "error_received", err)
		} else {
			return solana.PublicKey{}, nil, fmt.Errorf("failed to check token account %s: %w", ata.String(), err)
		}
	}

	// If account doesn't exist (bAccInfo is nil from a "not found" error) or is uninitialized (owned by SystemProgramID)
	if bAccInfo == nil || (bAccInfo != nil && bmodel.Address(solana.SystemProgramID.String()) == bAccInfo.Owner) {
		slog.Debug("Creating token account", "address", ata.String())
		createATAIx, err := associatedtokenaccount.NewCreateInstruction(
			payer,
			owner,
			mint,
		).ValidateAndBuild()
		if err != nil {
			return solana.PublicKey{}, nil, fmt.Errorf("failed to create ATA instruction: %w", err)
		}
		instructions = append(instructions, createATAIx)
	} else {
		// Account exists and is not owned by system program - validate it's a proper token account
		if err := s.validateTokenAccount(ctx, ata, owner, mint); err != nil {
			return solana.PublicKey{}, nil, fmt.Errorf("invalid token account %s: %w", ata.String(), err)
		}
	}

	return ata, instructions, nil
}

// validateTokenAccount validates that a token account has correct data structure and ownership
func (s *Service) validateTokenAccount(ctx context.Context, ata, expectedOwner, expectedMint solana.PublicKey) error {
	// Get account info with full data
	accInfo, err := s.chainClient.GetAccountInfo(ctx, bmodel.Address(ata.String()))
	if err != nil {
		return fmt.Errorf("failed to get account info: %w", err)
	}
	
	// Check if account data exists
	if accInfo.Data == nil || len(accInfo.Data) == 0 {
		return fmt.Errorf("account has no data")
	}
	
	// Token accounts should be exactly 165 bytes for standard SPL tokens
	// Note: Token-2022 accounts might be larger
	if len(accInfo.Data) != 165 {
		slog.Error("Invalid token account data size",
			"account", ata.String(),
			"size", len(accInfo.Data),
			"expected", 165,
			"owner", accInfo.Owner)
		return fmt.Errorf("invalid token account data size: %d bytes (expected 165)", len(accInfo.Data))
	}
	
	// Verify it's owned by the token program
	tokenProgramID := bmodel.Address(token.ProgramID.String())
	if accInfo.Owner != tokenProgramID {
		return fmt.Errorf("account not owned by token program: owned by %s", accInfo.Owner)
	}
	
	// Parse and validate token account data
	var tokenAccount token.Account
	decoder := bin.NewBinDecoder(accInfo.Data)
	if err := tokenAccount.UnmarshalWithDecoder(decoder); err != nil {
		return fmt.Errorf("failed to decode token account data: %w", err)
	}
	
	// Validate mint matches
	if tokenAccount.Mint != expectedMint {
		return fmt.Errorf("mint mismatch: expected %s, got %s", expectedMint, tokenAccount.Mint)
	}
	
	// Validate owner matches
	if tokenAccount.Owner != expectedOwner {
		return fmt.Errorf("owner mismatch: expected %s, got %s", expectedOwner, tokenAccount.Owner)
	}
	
	slog.Debug("Token account validated successfully",
		"ata", ata.String(),
		"owner", tokenAccount.Owner.String(),
		"mint", tokenAccount.Mint.String(),
		"amount", tokenAccount.Amount)
	
	return nil
}

// getTokenAccount gets or creates a token account for a given mint and owner
func (s *Service) getTokenAccount(ctx context.Context, mint, owner solana.PublicKey) (solana.PublicKey, []solana.Instruction, error) {
	ata, _, err := solana.FindAssociatedTokenAddress(owner, mint)
	if err != nil {
		return solana.PublicKey{}, nil, fmt.Errorf("failed to find associated token address: %w", err)
	}

	bAccInfo, err := s.chainClient.GetAccountInfo(ctx, bmodel.Address(ata.String()))
	if err != nil {
		if !strings.Contains(err.Error(), "account not found") && !strings.Contains(err.Error(), "nil value") {
			return solana.PublicKey{}, nil, fmt.Errorf("failed to check token account %s: %w", ata.String(), err)
		}
	}

	var instructions []solana.Instruction
	if bAccInfo == nil || bmodel.Address(solana.SystemProgramID.String()) == bAccInfo.Owner {
		slog.Debug("Creating token account", "address", ata.String())
		createATAIx, err := associatedtokenaccount.NewCreateInstruction(
			owner,
			owner,
			mint,
		).ValidateAndBuild()
		if err != nil {
			return solana.PublicKey{}, nil, fmt.Errorf("failed to create ATA instruction: %w", err)
		}
		instructions = append(instructions, createATAIx)
	}

	return ata, instructions, nil
}

// getMintInfo retrieves and parses mint account information
func (s *Service) getMintInfo(ctx context.Context, mint solana.PublicKey) (uint8, error) {
	bAccInfo, err := s.chainClient.GetAccountInfo(ctx, bmodel.Address(mint.String()))
	if err != nil {
		return 0, fmt.Errorf("failed to get mint info for %s: %w", mint.String(), err)
	}
	if bAccInfo == nil || len(bAccInfo.Data) == 0 { // Check Data length
		return 0, fmt.Errorf("invalid token mint %s: account not found or no data", mint.String())
	}

	// Attempt to parse as Solana Mint structure from bAccInfo.Data
	// The existing JSON parsing logic might be problematic if bAccInfo.Data is not JSON.
	// Solana mint data is binary.
	// For a typical Solana mint account, decimals are at offset 0 of the mint authority.
	// However, the provided JSON parsing was for rpc.GetAccountInfoResult.Value.Data.GetRawJSON()
	// which is different from bmodel.AccountInfo.Data which is []byte.
	// We need to parse the binary data directly.
	// A full MintLayout struct from spltoken can be used here.
	// For simplicity, if data is 82 bytes (common for Mint), decimals is at byte 44 for SPL Token program Mints
	// but this is very fragile. A proper deserialization is needed.
	// Let's assume the old JSON parsing logic was for a specific RPC response format that might not hold.
	// Direct binary parsing for SPL Token Mint:
	// First 36 bytes: MintAuthorityOption (u32) + MintAuthority (PublicKey)
	// Next 8 bytes: Supply (u64)
	// Next 1 byte: Decimals (u8) -> THIS IS WHAT WE WANT (Offset 36+8 = 44)
	// Next 1 byte: IsInitialized (bool)
	// Next 4 bytes: FreezeAuthorityOption (u32) + FreezeAuthority (PublicKey)

	// This is a simplified and potentially fragile way to get decimals.
	// A robust solution would use a proper struct deserializer for the mint account data.
	if len(bAccInfo.Data) >= 45 { // Mint authority (36) + supply (8) + decimals (1)
		// This assumes standard SPL Token mint layout.
		// Decimals are usually at offset 0 of the mint data itself, not 44 of the AccountInfo.Data
		// The `token.Mint` struct from `gagliardetto/solana-go/programs/token` can deserialize this.
		var solanaMint token.Mint
		if err := solanaMint.UnmarshalWithDecoder(bin.NewBinDecoder(bAccInfo.Data)); err == nil {
			return solanaMint.Decimals, nil
		} else {
			// Fallback or error if proper deserialization fails
			slog.WarnContext(ctx, "Failed to deserialize mint data using token.Mint, attempting direct byte access (fragile)", "mint", mint.String(), "error", err)
			// The previous JSON unmarshal logic was likely incorrect for raw binary mint data.
			// If the binary data was indeed JSON (e.g. from jsonParsed encoding before), that's different.
			// But bmodel.AccountInfo.Data is []byte.
			// Trying the previous logic's fallback if data structure was actually different:
			if len(bAccInfo.Data) >= 4 { // Very simplified, likely incorrect for standard mints
				return bAccInfo.Data[4], nil // This was the old fallback, likely wrong for mint decimals
			}
			return 0, fmt.Errorf("failed to parse decimals from mint data for %s: data too short or invalid format", mint.String())
		}
	}

	return 0, fmt.Errorf("invalid mint data length for %s: expected at least 45 bytes, got %d", mint.String(), len(bAccInfo.Data))
}

// buildTransaction creates a transaction with the given instructions
func (s *Service) buildTransaction(ctx context.Context, payer solana.PublicKey, instructions []solana.Instruction) (*solana.Transaction, error) {
	genericBlockhash, err := s.chainClient.GetLatestBlockhash(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent blockhash: %w", err)
	}
	solanaBlockHash, err := solana.HashFromBase58(string(genericBlockhash))
	if err != nil {
		return nil, fmt.Errorf("failed to convert generic blockhash to solana blockhash: %w", err)
	}
	slog.Debug("Recent blockhash obtained", "blockhash", solanaBlockHash)

	tx, err := solana.NewTransaction(
		instructions,
		solanaBlockHash,
		solana.TransactionPayer(payer),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	return tx, nil
}

// CreateWallet generates a new Solana wallet
func (s *Service) CreateWallet(ctx context.Context) (*WalletInfo, error) {
	slog.Info("Generating new Solana wallet...")

	// 1. Generate a new mnemonic phrase (12 words - 128 bits)
	entropy, err := bip39.NewEntropy(128)
	if err != nil {
		slog.Error("Failed to generate entropy", "error", err)
		return nil, fmt.Errorf("failed to generate entropy: %w", err)
	}
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		slog.Error("Failed to generate mnemonic", "error", err)
		return nil, fmt.Errorf("failed to generate mnemonic: %w", err)
	}
	slog.Debug("Generated mnemonic (SAVE THIS SECURELY!)", "mnemonic", mnemonic)

	// 2. Generate the seed from the mnemonic
	seed := bip39.NewSeed(mnemonic, "") // Standard empty passphrase

	// 3. Create the standard library ed25519 private key (64 bytes) from the first 32 bytes of the seed.
	if len(seed) < 32 {
		slog.Error("Generated seed is too short", "length", len(seed), "expected", 32)
		return nil, fmt.Errorf("generated seed is too short: %d bytes, expected at least 32", len(seed))
	}
	// This function returns the 64-byte key: 32-byte private scalar (derived from seed) + 32-byte public key
	stdLibPrivateKey := ed25519.NewKeyFromSeed(seed[:32])
	slog.Debug("Derived Ed25519 key material from seed")

	// 4. Cast the standard library key (which is []byte) to solana.PrivateKey type.
	// The solana-go library uses this 64-byte format internally.
	solanaPrivateKey := solana.PrivateKey(stdLibPrivateKey)

	// 5. Get the corresponding Solana public key using the method from solana.PrivateKey
	publicKey := solanaPrivateKey.PublicKey()
	slog.Debug("Derived public key", "public_key", publicKey.String())

	// 6. Save the Solana Private Key (as JSON byte array - full 64 bytes)
	// This format is directly usable by `solana-keygen verify` and other tools expecting the keypair file.
	privateKeyBytes := []byte(solanaPrivateKey) // This is the 64-byte keypair
	jsonData, err := json.Marshal(privateKeyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal private key: %w", err)
	}

	walletInfo := &WalletInfo{
		PublicKey: publicKey.String(),
		SecretKey: string(jsonData),
		Mnemonic:  mnemonic,
	}

	err = s.store.Wallet().Create(ctx, &model.Wallet{
		ID:        uuid.New().String(),
		PublicKey: walletInfo.PublicKey,
		CreatedAt: time.Now(),
	})
	if err != nil {
		return nil, fmt.Errorf("error storing wallet in db: %w", err)
	}

	return walletInfo, nil
}

// PrepareTransfer prepares an unsigned transfer transaction
func (s *Service) PrepareTransfer(ctx context.Context, fromAddress, toAddress, coinMintAddress string, amount float64) (string, error) {
	slog.Info("Preparing transfer",
		"from", fromAddress,
		"to", toAddress,
		"amount", amount,
		"coinMintAddress", coinMintAddress)

	from, err := s.parseAddress(fromAddress, "from")
	if err != nil {
		return "", err
	}

	to, err := s.parseAddress(toAddress, "to")
	if err != nil {
		return "", err
	}

	// Determine coin PKIDs and final mint addresses for the trade record
	var fromCoinPKID, toCoinPKID uint64
	var finalFromCoinMint, finalToCoinMint string
	var coinSymbol string // To store the symbol for the trade record

	if coinMintAddress == "" || coinMintAddress == model.SolMint { // Native SOL transfer
		finalFromCoinMint = model.SolMint
		finalToCoinMint = model.SolMint
		solCoinModel, serviceErr := s.coinService.GetCoinByAddress(ctx, model.SolMint)
		if serviceErr != nil {
			return "", fmt.Errorf("failed to get SOL coin details for trade record: %w", serviceErr)
		}
		fromCoinPKID = solCoinModel.ID
		toCoinPKID = solCoinModel.ID
		coinSymbol = solCoinModel.Symbol
	} else { // SPL Token transfer
		finalFromCoinMint = coinMintAddress
		finalToCoinMint = coinMintAddress
		coinModel, serviceErr := s.coinService.GetCoinByAddress(ctx, coinMintAddress)
		if serviceErr != nil {
			return "", fmt.Errorf("coin not found for mint %s for trade record: %w", coinMintAddress, serviceErr)
		}
		fromCoinPKID = coinModel.ID
		toCoinPKID = coinModel.ID
		coinSymbol = coinModel.Symbol
	}

	tx, err := s.createTokenTransfer(ctx, from, to, coinMintAddress, amount) // createTokenTransfer still uses original coinMintAddress for SPL mint logic
	if err != nil {
		slog.Error("Failed to create transfer transaction", "error", err)
		return "", fmt.Errorf("failed to create transfer transaction: %w", err)
	}

	// Serialize transaction to bytes
	txBytes, err := tx.MarshalBinary()
	if err != nil {
		return "", fmt.Errorf("failed to serialize transaction: %w", err)
	}

	// Encode transaction as base64
	unsignedTx := base64.StdEncoding.EncodeToString(txBytes)

	// Calculate network fee
	// NOTE: GenericClientAPI does not currently have a GetFeeForMessage method.
	// For Solana, the fee is typically fixed based on the number of signatures (e.g., 5000 lamports for 1-2 signatures).
	// We will use a default of 5000 lamports for now.
	// A more accurate calculation would require tx.Message.GetFee(s.chainClient.GetLamportsPerSignature()) if that were available,
	// or specific logic if fees become more dynamic (e.g. priority fees).
	defaultFeeLamports := uint64(5000)
	calculatedFeeSOL := float64(defaultFeeLamports) / float64(solana.LAMPORTS_PER_SOL)
	slog.Debug("Using default network fee for transfer", "lamports", defaultFeeLamports, "SOL", calculatedFeeSOL)

	// Create trade record
	trade := &model.Trade{
		Fee:                    calculatedFeeSOL, // Store calculated SOL fee
		TotalFeeAmount:         calculatedFeeSOL,
		TotalFeeMint:           model.SolMint,
		PlatformFeeAmount:      0.0, // Explicitly 0 for transfers
		PlatformFeeBps:         0, // Explicitly 0 for transfers
		PlatformFeeMint:        "",
		PlatformFeeDestination: "",
		RouteFeeAmount:         0.0,
		RouteFeeMints:          nil,
		RouteFeeDetails:        "",
		PriceImpactPercent:     0.0,
		FromCoinMintAddress:    finalFromCoinMint,
		FromCoinPKID:           fromCoinPKID,
		ToCoinMintAddress:      finalToCoinMint,
		ToCoinPKID:             toCoinPKID,
		CoinSymbol:             coinSymbol, // Populate CoinSymbol
		Type:                   "transfer",
		Amount:                 amount,
		Price:                  0.0,
		Status:                 "pending",
		UnsignedTransaction:    unsignedTx,
		CreatedAt:              time.Now(),
	}

	if err := s.store.Trades().Create(ctx, trade); err != nil {
		slog.Warn("Failed to create trade record", "error", err)
	}

	return unsignedTx, nil
}

// createTokenTransfer creates a token transfer transaction
func (s *Service) createTokenTransfer(ctx context.Context, from, to solana.PublicKey, tokenMint string, amount float64) (*solana.Transaction, error) {
	// Handle native SOL transfer (including Wrapped SOL)
	// Wrapped SOL mint: So11111111111111111111111111111111111111112
	if tokenMint == "" || tokenMint == "So11111111111111111111111111111111111111112" {
		slog.Debug("Creating SOL transfer transaction (native or wrapped)", "tokenMint", tokenMint)
		lamports := uint64(amount * float64(solana.LAMPORTS_PER_SOL))
		slog.Debug("Amount in lamports", "lamports", lamports)

		transferIx := system.NewTransferInstruction(
			lamports,
			from,
			to,
		).Build()

		return s.buildTransaction(ctx, from, []solana.Instruction{transferIx})
	}

	// Handle SPL token transfer
	mint, err := s.parseAddress(tokenMint, "token mint")
	if err != nil {
		return nil, err
	}

	// Get source and destination ATAs
	// For source account, we need to ensure it exists and has valid data
	// The third parameter should be the payer (from) for creating if needed
	fromATA, fromATAInstructions, err := s.getOrCreateATA(ctx, from, from, mint)
	if err != nil {
		return nil, fmt.Errorf("failed to get source token account: %w", err)
	}
	
	// If source ATA needs to be created, we can't transfer from it in the same transaction
	if len(fromATAInstructions) > 0 {
		return nil, fmt.Errorf("source token account does not exist or is not initialized - user must have tokens before sending")
	}

	toATA, createInstructions, err := s.getOrCreateATA(ctx, from, to, mint)
	if err != nil {
		return nil, fmt.Errorf("failed to get destination token account: %w", err)
	}

	// Get token decimals
	decimals, err := s.getMintInfo(ctx, mint)
	if err != nil {
		return nil, err
	}

	// Convert amount to raw units
	// Use math.Pow to avoid bit shifting issues with large decimals
	multiplier := math.Pow(10, float64(decimals))
	rawAmount := uint64(amount * multiplier)

	// Log transfer details before building instruction
	slog.Info("Building TransferChecked instruction",
		"amount", amount,
		"rawAmount", rawAmount,
		"decimals", decimals,
		"fromATA", fromATA.String(),
		"toATA", toATA.String(),
		"mint", mint.String(),
		"from", from.String())
	
	// Build transfer instruction with explicit signer
	transferIx := token.NewTransferCheckedInstruction(
		rawAmount,
		decimals,
		fromATA,
		mint,
		toATA,
		from,
		[]solana.PublicKey{}, // No additional signers needed, from is already a required signer
	).Build()

	// Combine all instructions
	instructions := append(createInstructions, transferIx)

	// Build transaction with from as fee payer and signer
	tx, err := s.buildTransaction(ctx, from, instructions)
	if err != nil {
		return nil, fmt.Errorf("failed to build transaction: %w", err)
	}

	// Log transaction details for debugging
	slog.Debug("Transaction details",
		"required_signatures", tx.Message.Header.NumRequiredSignatures,
		"readonly_signers", tx.Message.Header.NumReadonlySignedAccounts,
		"readonly_non_signers", tx.Message.Header.NumReadonlyUnsignedAccounts,
		"fee_payer", tx.Message.AccountKeys[0].String())

	return tx, nil
}

// SubmitTransfer submits a signed transfer transaction
func (s *Service) SubmitTransfer(ctx context.Context, req *TransferRequest) (string, error) {
	// Decode signed transaction
	txBytes, err := base64.StdEncoding.DecodeString(req.SignedTransaction)
	if err != nil {
		return "", fmt.Errorf("failed to decode signed transaction: %w", err)
	}

	// Parse transaction (optional here if SendRawTransaction takes bytes, but good for validation)
	_, err = solana.TransactionFromBytes(txBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse transaction: %w", err)
	}

	// Find the trade record by unsigned transaction BEFORE sending
	trade, err := s.store.Trades().GetByField(ctx, "unsigned_transaction", req.UnsignedTransaction)
	if err != nil {
		slog.Error("Critical: Failed to find trade record for unsigned transaction", "unsigned_tx", req.UnsignedTransaction, "error", err)
		// It's risky to submit a transaction if we can't track its corresponding trade record.
		// However, the original request implies sending anyway and then attempting to update.
		// For robustness, we should ideally return an error here if the trade record is essential for tracking.
		// For now, let's proceed but log a warning that updates might be missed. The polling logic below will handle nil trade.
		// To align with the new robust error handling, let's make finding the trade critical.
		return "", fmt.Errorf("failed to find trade record for unsigned_transaction %s: %w", req.UnsignedTransaction, err)
	}
	// Ensure trade is not nil if GetByField could technically return (nil, nil)
	if trade == nil {
		slog.Error("Critical: Trade record is nil even though GetByField returned no error", "unsigned_tx", req.UnsignedTransaction)
		return "", fmt.Errorf("trade record is nil for unsigned_transaction %s", req.UnsignedTransaction)
	}

	// Submit transaction
	maxRetries := uint(3)
	sig, sendErr := s.chainClient.SendRawTransaction(ctx, txBytes, bmodel.TransactionOptions{
		SkipPreflight:       false,
		PreflightCommitment: "confirmed",
		MaxRetries:          maxRetries,
	})

	if sendErr != nil {
		slog.Error("Failed to submit transaction to blockchain", "trade_id", trade.ID, "error", sendErr)
		trade.Status = "failed"
		errStr := sendErr.Error()
		trade.Error = errStr
		if updateErr := s.store.Trades().Update(ctx, trade); updateErr != nil {
			slog.Warn("Failed to update trade status to failed after SendRawTransaction error", "trade_id", trade.ID, "update_error", updateErr)
		}
		return "", fmt.Errorf("failed to submit transaction: %w", sendErr) // Return the original sendErr
	}

	// Transaction submitted successfully, update trade status to "submitted"
	slog.Info("Transaction submitted to blockchain", "trade_id", trade.ID, "signature", sig.String())
	trade.Status = "submitted"
	trade.TransactionHash = string(sig)
	trade.Error = ""                // Clear any previous error
	trade.CompletedAt = time.Time{} // Not completed yet
	trade.Finalized = false         // Not finalized yet

	if updateErr := s.store.Trades().Update(ctx, trade); updateErr != nil {
		slog.Warn("Failed to update trade status to submitted", "trade_id", trade.ID, "signature", sig.String(), "error", updateErr)
		// Even if DB update fails, the transaction was sent. Return success.
	}

	return string(sig), nil
}

func (s *Service) GetWalletBalances(ctx context.Context, address string) (*WalletBalance, error) {
	// Validate address format first
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("INVALID_ADDRESS: %v", err)
	}

	// Check if address is on curve (valid Solana address)
	if !solana.PublicKey(pubKey).IsOnCurve() {
		return nil, fmt.Errorf("INVALID_ADDRESS: address is not on curve")
	}

	// Get SOL balance first
	solBalanceResult, err := s.chainClient.GetBalance(ctx, bmodel.Address(pubKey.String()), "confirmed")
	if err != nil {
		// Check if it's a network/RPC error vs address not found
		if strings.Contains(err.Error(), "account not found") || strings.Contains(err.Error(), "nil value") {
			// Address is valid but has never been used on-chain
			return &WalletBalance{
				Balances: []Balance{}, // Empty balance array for unused address
			}, nil
		}
		return nil, fmt.Errorf("NETWORK_ERROR: failed to get SOL balance: %w", err)
	}
	solValue := solBalanceResult.UIAmount // UIAmount from bmodel.Balance

	// Get other token balances
	tokenBalances, err := s.getTokenBalances(ctx, address) // address is string
	if err != nil {
		// For token balance errors, we can still return SOL balance if we have it
		slog.Warn("Failed to get token balances, returning SOL balance only", "address", address, "error", err)
		if solValue > 0 {
			return &WalletBalance{
				Balances: []Balance{{
					ID:     model.SolMint,
					Amount: solValue,
				}},
			}, nil
		}
		return &WalletBalance{
			Balances: []Balance{},
		}, nil
	}

	var allBalances []Balance
	if solValue > 0 {
		nativeSolBalance := Balance{ // This is wallet.Balance, not bmodel.Balance
			ID:     model.NativeSolMint, // Use distinct identifier for native SOL
			Amount: solValue,
		}
		allBalances = append([]Balance{nativeSolBalance}, tokenBalances...)
	} else {
		allBalances = tokenBalances
	}

	return &WalletBalance{
		Balances: allBalances,
	}, nil
}

// getTokenBalances is a helper function that gets just the token balances
func (s *Service) getTokenBalances(ctx context.Context, address string) ([]Balance, error) {
	// Validate wallet address
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid wallet address: %v", err)
	}

	// Create a timeout context specifically for the GetTokenAccountsByOwner call
	// This operation can be resource-intensive for addresses with many token accounts
	tokenCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()

	// Get token accounts using generic client
	tokenAccounts, err := s.chainClient.GetTokenAccountsByOwner(
		tokenCtx,
		bmodel.Address(pubKey.String()),
		bmodel.TokenAccountsOptions{Encoding: string(solana.EncodingJSONParsed)}, // Using solana specific encoding
	)
	if err != nil {
		// Check if it's a timeout error and provide a more helpful message
		if errors.Is(err, context.DeadlineExceeded) || strings.Contains(err.Error(), "context canceled") || strings.Contains(err.Error(), "context deadline exceeded") {
			return []Balance{}, fmt.Errorf("failed to get token accounts: request timed out after 45 seconds - this address may have too many token accounts")
		}
		return []Balance{}, fmt.Errorf("failed to get token accounts: %w", err)
	}

	tokens := make([]Balance, 0)
	for _, accInfo := range tokenAccounts {
		if accInfo.UIAmount > 0 { // Filter out zero balance tokens
			tokens = append(tokens, Balance{ // This is wallet.Balance
				ID:     string(accInfo.MintAddress),
				Amount: accInfo.UIAmount,
				// Symbol and other details might need to be fetched based on MintAddress
				// if not already part of a richer bmodel.TokenAccountInfo
			})
		}
	}

	return tokens, nil
}

// TokenPnLData represents PnL data for a single token
type TokenPnLData struct {
	CoinID           string
	Symbol           string
	Name             string
	AmountHeld       float64
	CostBasis        float64
	CurrentPrice     float64
	CurrentValue     float64
	UnrealizedPnL    float64
	PnLPercentage    float64
	HasPurchaseData  bool
}

// GetPortfolioPnL calculates profit and loss for a wallet
func (s *Service) GetPortfolioPnL(ctx context.Context, walletAddress string) (totalValue float64, totalCostBasis float64, totalUnrealizedPnL float64, totalPnLPercentage float64, totalHoldings int32, tokenPnLs []TokenPnLData, err error) {
	// Note: We calculate PnL based only on trades in our database
	// This gives accurate trading performance metrics

	// Get all completed trades for this wallet
	sortBy := "created_at"
	sortDesc := false
	trades, _, err := s.store.Trades().ListWithOpts(ctx, db.ListOptions{
		Filters: []db.FilterOption{
			{Field: "user_id", Operator: db.FilterOpEqual, Value: walletAddress},
			// Try multiple status values that indicate completion
			{Field: "status", Operator: db.FilterOpIn, Value: []string{"completed", "finalized", "confirmed", "processed"}},
		},
		SortBy:   &sortBy,
		SortDesc: &sortDesc,
	})
	if err != nil {
		return 0, 0, 0, 0, 0, nil, fmt.Errorf("failed to get trades: %w", err)
	}

	// Build holdings based on our trade records (not wallet balances)
	// This ensures we only calculate PnL for amounts we can track
	holdings := make(map[string]float64)

	// Calculate cost basis for each token from trade history
	costBasisMap := make(map[string]struct {
		totalCost   float64
		totalAmount float64
	})

	for _, trade := range trades {
		// For buys and swaps where we received the token
		if trade.Type == "buy" || (trade.Type == "swap" && trade.ToCoinMintAddress != "") {
			tokenID := trade.ToCoinMintAddress
			if tokenID == "" {
				tokenID = trade.FromCoinMintAddress // Fallback for buy trades
			}
			
			data := costBasisMap[tokenID]
			
			// Calculate cost basis based on trade type
			costInUSD := 0.0
			if trade.Type == "swap" && trade.FromCoinMintAddress != "" {
				// For swaps, trade.Price is the exchange rate (how many TO tokens per FROM token)
				// We need to calculate: FROM amount * FROM price = cost in USD
				// FROM amount = TO amount / exchange rate
				fromAmount := trade.Amount / trade.Price
				
				// Get the price of the FROM token
				fromCoin, err := s.coinService.GetCoinByAddress(ctx, trade.FromCoinMintAddress)
				if err == nil && fromCoin != nil && fromCoin.Price > 0 {
					costInUSD = fromAmount * fromCoin.Price
				} else {
					// If we can't get the from coin price, skip this trade
					slog.Warn("Could not get price for from coin in swap", 
						"from_coin", trade.FromCoinMintAddress, 
						"to_coin", tokenID,
						"error", err)
					continue
				}
			} else if trade.Type == "buy" {
				// For direct buys, trade.Price should be the USD price per token
				costInUSD = trade.Amount * trade.Price
			}
			
			data.totalCost += costInUSD
			data.totalAmount += trade.Amount
			costBasisMap[tokenID] = data
			
			// Track holdings based on trades
			holdings[tokenID] += trade.Amount
			slog.Debug("Added to holdings from trade",
				"token", tokenID,
				"amount", trade.Amount,
				"new_total", holdings[tokenID])
		}
		
		// For swaps, also track what we spent
		if trade.Type == "swap" && trade.FromCoinMintAddress != "" {
			// For swaps: trade.Amount is output amount, trade.Price is exchange rate
			// Input amount = Output amount / Exchange rate
			inputAmount := trade.Amount / trade.Price
			holdings[trade.FromCoinMintAddress] -= inputAmount
			slog.Debug("Subtracted from holdings for swap",
				"token", trade.FromCoinMintAddress,
				"amount", inputAmount,
				"new_total", holdings[trade.FromCoinMintAddress])
		}
	}

	// Get current prices for all held tokens
	var tokenPnLList []TokenPnLData
	totalPortfolioValue := 0.0
	totalPortfolioCostBasis := 0.0
	
	slog.Info("Portfolio holdings from trades", 
		"wallet", walletAddress,
		"holdings_count", len(holdings),
		"trades_processed", len(trades))

	for coinID, amount := range holdings {
		// Skip if no balance or very small (rounding errors)
		if amount <= 0.00000001 {
			continue
		}

		// Get coin info and current price
		coin, err := s.coinService.GetCoinByAddress(ctx, coinID)
		if err != nil {
			slog.Warn("Failed to get coin info", "coin_id", coinID, "error", err)
			continue
		}

		// Get current price
		currentPrice := 0.0
		if coin != nil && coin.Price > 0 {
			currentPrice = coin.Price
		}

		// Calculate cost basis
		costBasis := 0.0
		hasPurchaseData := false
		if data, exists := costBasisMap[coinID]; exists && data.totalAmount > 0 {
			costBasis = data.totalCost / data.totalAmount
			hasPurchaseData = true
		}
		
		// Skip tokens without purchase data
		if !hasPurchaseData {
			continue
		}

		// Calculate values based on our tracked holdings
		currentValue := amount * currentPrice
		totalCost := amount * costBasis
		unrealizedPnL := currentValue - totalCost
		
		// Round to avoid floating point precision issues
		unrealizedPnL = math.Round(unrealizedPnL*1e8) / 1e8 // Round to 8 decimal places
		
		pnlPercentage := 0.0
		if totalCost > 0 && math.Abs(unrealizedPnL) > 0.00000001 { // Ignore tiny differences
			pnlPercentage = unrealizedPnL / totalCost // Keep as decimal (0.2534 for 25.34%)
			pnlPercentage = math.Round(pnlPercentage*10000) / 10000 // Round to 4 decimal places
		}

		// Add to totals
		totalPortfolioValue += currentValue
		if hasPurchaseData {
			totalPortfolioCostBasis += totalCost
		} else {
			// For tokens without purchase data, use current value as cost basis
			totalPortfolioCostBasis += currentValue
		}

		// Create token PnL data
		tokenPnL := TokenPnLData{
			CoinID:          coinID,
			Symbol:          coin.Symbol,
			Name:            coin.Name,
			AmountHeld:      amount, // Amount based on our trade records
			CostBasis:       costBasis,
			CurrentPrice:    currentPrice,
			CurrentValue:    currentValue,
			UnrealizedPnL:   unrealizedPnL,
			PnLPercentage:   pnlPercentage,
			HasPurchaseData: hasPurchaseData,
		}

		tokenPnLList = append(tokenPnLList, tokenPnL)
	}

	// Calculate overall portfolio metrics
	totalUnrealizedPnL = totalPortfolioValue - totalPortfolioCostBasis
	totalUnrealizedPnL = math.Round(totalUnrealizedPnL*1e8) / 1e8 // Round to 8 decimal places
	
	totalPnLPercentage = 0.0
	if totalPortfolioCostBasis > 0 && math.Abs(totalUnrealizedPnL) > 0.00000001 {
		totalPnLPercentage = totalUnrealizedPnL / totalPortfolioCostBasis // Keep as decimal
		totalPnLPercentage = math.Round(totalPnLPercentage*10000) / 10000 // Round to 4 decimal places
	}

	return totalPortfolioValue, totalPortfolioCostBasis, totalUnrealizedPnL, totalPnLPercentage, int32(len(tokenPnLList)), tokenPnLList, nil
}
