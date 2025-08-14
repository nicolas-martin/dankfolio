package wallet

import (
	"context"
	"encoding/base64"
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

	bclient "github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
	coinservice "github.com/nicolas-martin/dankfolio/backend/internal/service/coin" // Added for CoinServiceAPI
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price" // Added for PriceServiceAPI
)

// Service handles wallet-related operations
type Service struct {
	chainClient  bclient.GenericClientAPI // Use generic blockchain client interface
	store        db.Store
	coinService  coinservice.CoinServiceAPI // Added CoinService
	priceService price.PriceServiceAPI // Added PriceService for efficient price fetching
	coinCache    coinservice.CoinCache // Added coin cache for price optimization
}

// New creates a new wallet service
func New(chainClient bclient.GenericClientAPI, store db.Store, coinService coinservice.CoinServiceAPI, priceService price.PriceServiceAPI, coinCache coinservice.CoinCache) *Service { // Accept generic client
	return &Service{
		chainClient:  chainClient,
		store:        store,
		coinService:  coinService, // Store injected CoinService
		priceService: priceService, // Store injected PriceService for efficient price fetching
		coinCache:    coinCache, // Store injected coin cache for price optimization
	}
}

// ValidatePublicKey validates that a string is a valid Solana public key
func (s *Service) ValidatePublicKey(ctx context.Context, publicKey string) error {
	_, err := solana.PublicKeyFromBase58(publicKey)
	if err != nil {
		return fmt.Errorf("invalid Solana public key: %w", err)
	}
	return nil
}

// RegisterWallet registers a client-generated wallet (stores only public key)
// This is the secure way to handle wallets - the server never knows the private key
func (s *Service) RegisterWallet(ctx context.Context, publicKey string) error {
	// Validate the public key
	if err := s.ValidatePublicKey(ctx, publicKey); err != nil {
		return err
	}

	// Check if wallet already exists
	existingWallet, err := s.store.Wallet().GetByField(ctx, "public_key", publicKey)
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		return fmt.Errorf("failed to check existing wallet: %w", err)
	}

	if existingWallet != nil {
		// Wallet already registered, that's okay
		slog.Info("Wallet already registered", "public_key", publicKey)
		return nil
	}

	// Create new wallet record
	wallet := &model.Wallet{
		ID:        uuid.New().String(),
		PublicKey: publicKey,
		CreatedAt: time.Now(),
	}

	// Store in database
	if err := s.store.Wallet().Create(ctx, wallet); err != nil {
		return fmt.Errorf("failed to register wallet: %w", err)
	}

	slog.Info("Wallet registered successfully (client-side generation)",
		"wallet_id", wallet.ID,
		"public_key", publicKey)

	return nil
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
	if len(accInfo.Data) == 0 {
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
	slog.Info("Recent blockhash obtained for transaction", 
		"blockhash", solanaBlockHash.String(),
		"payer", payer.String())

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
// CreateWallet has been removed for security reasons
// Wallets should be generated client-side to ensure private keys never leave the user's device
// Use RegisterWallet instead to register client-generated wallets

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

	// Determine which coin address to fetch
	var coinAddressToFetch string
	if coinMintAddress == "" || coinMintAddress == model.NativeSolMint || coinMintAddress == model.SolMint { // Native SOL transfer
		finalFromCoinMint = model.SolMint
		finalToCoinMint = model.SolMint
		coinAddressToFetch = model.SolMint
	} else { // SPL Token transfer
		finalFromCoinMint = coinMintAddress
		finalToCoinMint = coinMintAddress
		coinAddressToFetch = coinMintAddress
	}

	// Batch fetch coin data (single item in this case, but using batch API for consistency)
	coins, serviceErr := s.coinService.GetCoinsByAddresses(ctx, []string{coinAddressToFetch}, false)
	if serviceErr != nil || len(coins) == 0 {
		return "", fmt.Errorf("failed to get coin details for %s: %w", coinAddressToFetch, serviceErr)
	}

	coinModel := &coins[0]
	fromCoinPKID = coinModel.ID
	toCoinPKID = coinModel.ID
	coinSymbol = coinModel.Symbol

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
		PlatformFeeBps:         0,   // Explicitly 0 for transfers
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
		FromUSDPrice:           0.0,
		ToUSDPrice:             0.0,
		TotalUSDCost:           0.0,
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
	// Log input parameters for debugging
	slog.Debug("createTokenTransfer called",
		"from", from.String(),
		"to", to.String(),
		"tokenMint", tokenMint,
		"amount", amount)

	// Handle native SOL transfer (including Wrapped SOL)
	// Native SOL mint: 11111111111111111111111111111111
	// Wrapped SOL mint: So11111111111111111111111111111111111111112
	if tokenMint == "" ||
		tokenMint == model.NativeSolMint ||
		tokenMint == model.SolMint {
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
		slog.Error("Failed to parse token mint address", "tokenMint", tokenMint, "error", err)
		return nil, fmt.Errorf("invalid token mint address '%s': %w", tokenMint, err)
	}

	// Validate mint is not zero
	if mint.IsZero() {
		slog.Error("Token mint is zero after parsing", "tokenMint", tokenMint)
		return nil, fmt.Errorf("token mint address parsed to zero value")
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
		
		// Check if this is a blockhash expiration error
		errMsg := sendErr.Error()
		if strings.Contains(errMsg, "Blockhash not found") || 
		   strings.Contains(errMsg, "BlockhashNotFound") {
			slog.Warn("Transaction failed due to expired blockhash", "trade_id", trade.ID)
			// Don't mark trade as failed - this is recoverable by re-preparing
			return "", fmt.Errorf("BLOCKHASH_EXPIRED: Transaction blockhash has expired. Please try again.")
		}
		
		// For other errors, mark trade as failed
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

	// Get combined SOL balance (native SOL + any wSOL tokens)
	solNormalizer := NewSOLNormalizer(s.chainClient)
	combinedSOLBalance, err := solNormalizer.GetCombinedSOLBalance(ctx, pubKey.String())
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
	solValue := combinedSOLBalance.Amount // Combined SOL amount

	// Get other token balances
	tokenBalances, err := s.getTokenBalances(ctx, address) // address is string
	if err != nil {
		// For token balance errors, we can still return SOL balance if we have it
		slog.Warn("Failed to get token balances, returning SOL balance only", "address", address, "error", err)
		if solValue > 0 {
			return &WalletBalance{
				Balances: []Balance{{
					ID:     model.NativeSolMint, // Use native SOL representation for user display
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
	CoinID          string
	Symbol          string
	Name            string
	AmountHeld      float64
	CostBasis       float64
	CurrentPrice    float64
	CurrentValue    float64
	UnrealizedPnL   float64
	PnLPercentage   float64
	HasPurchaseData bool
}

// GetPortfolioPnL calculates profit and loss for a wallet
func (s *Service) GetPortfolioPnL(ctx context.Context, walletAddress string) (totalValue float64, totalCostBasis float64, totalUnrealizedPnL float64, totalPnLPercentage float64, totalHoldings int32, tokenPnLs []TokenPnLData, err error) {
	// Note: We calculate PnL based only on trades in our database
	// But total portfolio value includes ALL coins in the wallet

	// First, get the actual wallet balances to calculate total portfolio value
	walletBalances, err := s.GetWalletBalances(ctx, walletAddress)
	if err != nil {
		slog.Warn("Failed to get wallet balances for total value calculation", "error", err)
		// Continue with trade-based calculation only
		walletBalances = &WalletBalance{Balances: []Balance{}}
	}

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

			// Use stored USD cost from the trade
			costInUSD := trade.TotalUSDCost

			// Skip trades without USD cost data
			if costInUSD <= 0 {
				slog.Warn("Trade has no USD cost data, skipping",
					"trade_id", trade.ID,
					"type", trade.Type,
					"from_coin", trade.FromCoinMintAddress,
					"to_coin", tokenID)
				continue
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
		if trade.Type == "swap" && trade.FromCoinMintAddress != "" && trade.FromUSDPrice > 0 && trade.TotalUSDCost > 0 {
			// Calculate input amount from USD values
			// Input amount = Total USD cost / FROM token USD price
			inputAmount := trade.TotalUSDCost / trade.FromUSDPrice
			holdings[trade.FromCoinMintAddress] -= inputAmount
			slog.Debug("Subtracted from holdings for swap",
				"token", trade.FromCoinMintAddress,
				"amount", inputAmount,
				"from_usd_price", trade.FromUSDPrice,
				"total_usd_cost", trade.TotalUSDCost,
				"new_total", holdings[trade.FromCoinMintAddress])
		}
	}

	// Create a map of actual wallet balances for filtering
	walletBalanceMap := make(map[string]float64)
	for _, balance := range walletBalances.Balances {
		walletBalanceMap[balance.ID] = balance.Amount
	}

	// Get current prices for all held tokens
	var tokenPnLList []TokenPnLData
	totalPortfolioValue := 0.0
	totalPortfolioCostBasis := 0.0

	slog.Info("Portfolio holdings from trades",
		"wallet", walletAddress,
		"holdings_count", len(holdings),
		"trades_processed", len(trades))

	// Collect all coin IDs that need price data
	var coinIDsToFetch []string
	for coinID, amount := range holdings {
		// Skip if no balance or very small (rounding errors)
		if amount <= 0.00000001 {
			continue
		}

		// IMPORTANT: Check if this token still exists in the wallet
		// If the user sold all tokens, don't show it in PnL
		actualBalance, existsInWallet := walletBalanceMap[coinID]
		if !existsInWallet || actualBalance <= 0.00000001 {
			slog.Debug("Skipping token not in wallet", "coin_id", coinID, "trade_balance", amount, "wallet_balance", actualBalance)
			continue
		}

		coinIDsToFetch = append(coinIDsToFetch, coinID)
	}

	// Optimized coin data fetching for PnL - check cache first, then use price service if needed
	var coinDataMap map[string]*model.Coin
	if len(coinIDsToFetch) > 0 {
		coinDataMap = s.getOptimizedCoinDataForPnL(ctx, coinIDsToFetch)
	} else {
		coinDataMap = make(map[string]*model.Coin)
	}

	// Process holdings with fetched coin data
	for coinID, amount := range holdings {
		// Skip if no balance or very small (rounding errors)
		if amount <= 0.00000001 {
			continue
		}

		// IMPORTANT: Check if this token still exists in the wallet
		// If the user sold all tokens, don't show it in PnL
		actualBalance, existsInWallet := walletBalanceMap[coinID]
		if !existsInWallet || actualBalance <= 0.00000001 {
			continue
		}

		// Get coin info from batch fetch results
		coin, exists := coinDataMap[coinID]
		if !exists || coin == nil {
			slog.Warn("Coin data not found in batch results", "coin_id", coinID)
			continue
		}

		// Get current price
		currentPrice := 0.0
		if coin.Price > 0 {
			currentPrice = coin.Price
		}

		// Calculate cost basis and historical cost
		costBasis := 0.0
		proportionalCost := 0.0
		hasPurchaseData := false
		if data, exists := costBasisMap[coinID]; exists && data.totalAmount > 0 {
			costBasis = data.totalCost / data.totalAmount // Cost per token for display
			// Calculate proportional historical cost based on current holdings
			proportionalCost = (actualBalance / data.totalAmount) * data.totalCost
			hasPurchaseData = true
		}

		// Skip tokens without purchase data
		if !hasPurchaseData {
			continue
		}

		// Use the actual wallet balance for calculations
		displayAmount := actualBalance

		// Calculate PnL using proportional historical cost vs current value
		currentValue := displayAmount * currentPrice
		unrealizedPnL := currentValue - proportionalCost

		// Round to avoid floating point precision issues
		unrealizedPnL = math.Round(unrealizedPnL*1e8) / 1e8 // Round to 8 decimal places

		pnlPercentage := 0.0
		if proportionalCost > 0 && math.Abs(unrealizedPnL) > 0.00000001 { // Ignore tiny differences
			pnlPercentage = unrealizedPnL / proportionalCost        // Keep as decimal (0.2534 for 25.34%)
			pnlPercentage = math.Round(pnlPercentage*10000) / 10000 // Round to 4 decimal places
		}

		// Add to totals
		totalPortfolioValue += currentValue
		if hasPurchaseData {
			totalPortfolioCostBasis += proportionalCost // Use proportional cost, not recalculated cost
		} else {
			// For tokens without purchase data, use current value as cost basis
			totalPortfolioCostBasis += currentValue
		}

		// Create token PnL data
		tokenPnL := TokenPnLData{
			CoinID:          coinID,
			Symbol:          coin.Symbol,
			Name:            coin.Name,
			AmountHeld:      displayAmount, // Use actual wallet balance
			CostBasis:       costBasis,
			CurrentPrice:    currentPrice,
			CurrentValue:    currentValue,
			UnrealizedPnL:   unrealizedPnL,
			PnLPercentage:   pnlPercentage,
			HasPurchaseData: hasPurchaseData,
		}

		tokenPnLList = append(tokenPnLList, tokenPnL)
	}

	// Now calculate the ACTUAL total portfolio value from ALL wallet balances
	// This includes tokens we may not have trade history for
	actualTotalPortfolioValue := 0.0

	// Collect all wallet balance coin IDs that need price data
	var walletCoinIDs []string
	for _, balance := range walletBalances.Balances {
		if balance.Amount > 0 {
			walletCoinIDs = append(walletCoinIDs, balance.ID)
		}
	}

	// Optimized batch fetch prices for all wallet balances using same strategy
	var walletCoinDataMap map[string]*model.Coin
	if len(walletCoinIDs) > 0 {
		walletCoinDataMap = s.getOptimizedCoinDataForPnL(ctx, walletCoinIDs)
	} else {
		walletCoinDataMap = make(map[string]*model.Coin)
	}

	// Calculate total value using fetched prices
	for _, balance := range walletBalances.Balances {
		if balance.Amount <= 0 {
			continue
		}

		// Get coin from batch fetch results
		coin, exists := walletCoinDataMap[balance.ID]
		if !exists || coin == nil {
			slog.Warn("Wallet coin data not found in batch results", "coin_id", balance.ID)
			continue
		}

		if coin.Price > 0 {
			currentValue := balance.Amount * coin.Price
			actualTotalPortfolioValue += currentValue
		}
	}

	// Calculate overall portfolio metrics
	// IMPORTANT: PnL calculations are based ONLY on tokens with trade history
	// totalPortfolioValue from traded tokens was already calculated in the loop above
	totalTradedPortfolioValue := totalPortfolioValue // Save the traded portfolio value for PnL calculation

	totalUnrealizedPnL = totalTradedPortfolioValue - totalPortfolioCostBasis
	totalUnrealizedPnL = math.Round(totalUnrealizedPnL*1e8) / 1e8 // Round to 8 decimal places

	totalPnLPercentage = 0.0
	if totalPortfolioCostBasis > 0 && math.Abs(totalUnrealizedPnL) > 0.00000001 {
		totalPnLPercentage = totalUnrealizedPnL / totalPortfolioCostBasis // Keep as decimal
		totalPnLPercentage = math.Round(totalPnLPercentage*10000) / 10000 // Round to 4 decimal places
	}

	// Now use the actual portfolio value from ALL wallet balances for the total
	totalPortfolioValue = actualTotalPortfolioValue

	return totalPortfolioValue, totalPortfolioCostBasis, totalUnrealizedPnL, totalPnLPercentage, int32(len(tokenPnLList)), tokenPnLList, nil
}

// getOptimizedCoinDataForPnL efficiently fetches coin data for PnL calculations
// It prioritizes cached data and only fetches fresh prices when needed
func (s *Service) getOptimizedCoinDataForPnL(ctx context.Context, coinIDs []string) map[string]*model.Coin {
	coinDataMap := make(map[string]*model.Coin)
	var coinsNeedingPriceUpdate []string
	var addressesToUpdate []string
	
	// Step 1: Check cache for fresh data (< 2 minutes)
	for _, coinID := range coinIDs {
		cacheKey := fmt.Sprintf("coin:%s", coinID)
		if cachedCoins, found := s.coinCache.Get(cacheKey); found && len(cachedCoins) > 0 {
			// Cache hit - use fresh cached data
			coinCopy := cachedCoins[0]
			coinDataMap[coinID] = &coinCopy
			slog.DebugContext(ctx, "Using cached coin data for PnL", "address", coinID, "price", coinCopy.Price)
			continue
		}
		
		// Cache miss - need to check database and potentially update
		coinsNeedingPriceUpdate = append(coinsNeedingPriceUpdate, coinID)
	}
	
	if len(coinsNeedingPriceUpdate) == 0 {
		// All coins were found in cache
		slog.InfoContext(ctx, "All coin data found in cache for PnL calculation", "cached_count", len(coinDataMap))
		return coinDataMap
	}
	
	// Step 2: Get existing coins from database 
	existingCoins, err := s.store.Coins().GetByAddresses(ctx, coinsNeedingPriceUpdate)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to get existing coins from database for PnL", "error", err)
		return coinDataMap
	}
	
	existingCoinsMap := make(map[string]*model.Coin)
	for i := range existingCoins {
		existingCoinsMap[existingCoins[i].Address] = &existingCoins[i]
	}
	
	// Step 3: Categorize coins by freshness 
	for _, coinID := range coinsNeedingPriceUpdate {
		if coin, exists := existingCoinsMap[coinID]; exists {
			// Check if price data is fresh (< 2 minutes based on LastUpdated)
			if s.isCoinPriceFresh(coin) {
				// Use existing fresh data
				coinDataMap[coinID] = coin
				// Also update cache for future use
				cacheKey := fmt.Sprintf("coin:%s", coinID)
				s.coinCache.Set(cacheKey, []model.Coin{*coin}, coinservice.CoinCacheExpiry)
				slog.DebugContext(ctx, "Using fresh database coin data for PnL", "address", coinID, "price", coin.Price)
			} else {
				// Price data is stale, needs update
				addressesToUpdate = append(addressesToUpdate, coinID)
				// Still add the stale coin to map as fallback
				coinDataMap[coinID] = coin
			}
		} else {
			// Coin doesn't exist in database - this shouldn't happen in PnL context
			// but we'll handle it gracefully
			slog.WarnContext(ctx, "Coin not found in database for PnL calculation", "address", coinID)
		}
	}
	
	// Step 4: Update stale prices using price service (lightweight operation)
	if len(addressesToUpdate) > 0 {
		slog.InfoContext(ctx, "Updating stale prices for PnL calculation", "addresses_to_update", len(addressesToUpdate))
		
		// Get fresh prices from price service
		freshPrices, err := s.priceService.GetCoinPrices(ctx, addressesToUpdate)
		if err != nil {
			slog.WarnContext(ctx, "Failed to get fresh prices for PnL, using stale data", "error", err)
		} else {
			// Update coins with fresh prices and save to database
			for _, address := range addressesToUpdate {
				if coin, exists := coinDataMap[address]; exists {
					if newPrice, priceExists := freshPrices[address]; priceExists && newPrice > 0 {
						// Update coin with fresh price
						coin.Price = newPrice
						coin.LastUpdated = time.Now().Format(time.RFC3339)
						
						// Update in database 
						if updateErr := s.store.Coins().Update(ctx, coin); updateErr != nil {
							slog.WarnContext(ctx, "Failed to update coin price in database", "address", address, "error", updateErr)
						}
						
						// Update cache with fresh data
						cacheKey := fmt.Sprintf("coin:%s", address)
						s.coinCache.Set(cacheKey, []model.Coin{*coin}, coinservice.CoinCacheExpiry)
						
						slog.DebugContext(ctx, "Updated coin price for PnL", "address", address, "new_price", newPrice)
					}
				}
			}
		}
	}
	
	slog.InfoContext(ctx, "Completed optimized coin data fetch for PnL", 
		"total_requested", len(coinIDs),
		"cached_hits", len(coinIDs)-len(coinsNeedingPriceUpdate),
		"database_queries", len(coinsNeedingPriceUpdate),
		"price_updates", len(addressesToUpdate))
	
	return coinDataMap
}

// isCoinPriceFresh checks if a coin's price data is fresh (< 2 minutes)
func (s *Service) isCoinPriceFresh(coin *model.Coin) bool {
	if coin.LastUpdated == "" {
		return false
	}
	
	lastUpdated, err := time.Parse(time.RFC3339, coin.LastUpdated)
	if err != nil {
		slog.Warn("Failed to parse coin LastUpdated time", "address", coin.Address, "lastUpdated", coin.LastUpdated, "error", err)
		return false
	}
	
	// Consider fresh if updated within last 2 minutes (same as cache TTL)
	return time.Since(lastUpdated) < coinservice.CoinCacheExpiry
}
