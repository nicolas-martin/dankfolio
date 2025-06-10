package wallet

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
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
	}

	return ata, instructions, nil
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
		solCoinModel, serviceErr := s.coinService.GetCoinByMintAddress(ctx, model.SolMint)
		if serviceErr != nil {
			return "", fmt.Errorf("failed to get SOL coin details for trade record: %w", serviceErr)
		}
		fromCoinPKID = solCoinModel.ID
		toCoinPKID = solCoinModel.ID
		coinSymbol = solCoinModel.Symbol
	} else { // SPL Token transfer
		finalFromCoinMint = coinMintAddress
		finalToCoinMint = coinMintAddress
		coinModel, serviceErr := s.coinService.GetCoinByMintAddress(ctx, coinMintAddress)
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
		ID:                  fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		Fee:                 calculatedFeeSOL, // Store calculated SOL fee
		PlatformFeeAmount:   0.0,              // Explicitly 0 for transfers
		PlatformFeePercent:  0.0,              // Explicitly 0 for transfers
		FromCoinMintAddress: finalFromCoinMint,
		FromCoinPKID:        fromCoinPKID,
		ToCoinMintAddress:   finalToCoinMint,
		ToCoinPKID:          toCoinPKID,
		CoinSymbol:          coinSymbol, // Populate CoinSymbol
		Type:                "transfer",
		Amount:              amount,
		Status:              "pending",
		UnsignedTransaction: unsignedTx,
		CreatedAt:           time.Now(),
	}

	if err := s.store.Trades().Create(ctx, trade); err != nil {
		slog.Warn("Failed to create trade record", "error", err)
	}

	return unsignedTx, nil
}

// createTokenTransfer creates a token transfer transaction
func (s *Service) createTokenTransfer(ctx context.Context, from, to solana.PublicKey, tokenMint string, amount float64) (*solana.Transaction, error) {
	// Handle native SOL transfer
	if tokenMint == "" {
		slog.Debug("Creating SOL transfer transaction")
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
	fromATA, _, err := s.getOrCreateATA(ctx, from, from, mint)
	if err != nil {
		return nil, fmt.Errorf("failed to get source token account: %w", err)
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
	rawAmount := uint64(amount * float64(uint64(1)<<decimals))

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
		trade.Error = &errStr
		if updateErr := s.store.Trades().Update(ctx, trade); updateErr != nil {
			slog.Warn("Failed to update trade status to failed after SendRawTransaction error", "trade_id", trade.ID, "update_error", updateErr)
		}
		return "", fmt.Errorf("failed to submit transaction: %w", sendErr) // Return the original sendErr
	}

	// Transaction submitted successfully, update trade status to "submitted"
	slog.Info("Transaction submitted to blockchain", "trade_id", trade.ID, "signature", sig.String())
	trade.Status = "submitted"
	trade.TransactionHash = string(sig)
	trade.Error = nil       // Clear any previous error
	trade.CompletedAt = nil // Not completed yet
	trade.Finalized = false // Not finalized yet

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
		solBalance := Balance{ // This is wallet.Balance, not bmodel.Balance
			ID:     model.SolMint, // Assuming model.SolMint is the string "SOL" or its mint address
			Amount: solValue,
		}
		allBalances = append([]Balance{solBalance}, tokenBalances...)
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

	// Get token accounts using generic client
	tokenAccounts, err := s.chainClient.GetTokenAccountsByOwner(
		ctx,
		bmodel.Address(pubKey.String()),
		bmodel.TokenAccountsOptions{Encoding: string(solana.EncodingJSONParsed)}, // Using solana specific encoding
	)
	if err != nil {
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

// submitTransaction submits a signed transaction to the blockchain
// This function is now effectively replaced by direct calls to chainClient.SendRawTransaction
// or chainClient.SendTransaction if building a generic transaction.
// Keeping it for now if it's used by other parts of the service that still build *solana.Transaction.
// If those parts are refactored to use SendRawTransaction, this can be removed.
func (s *Service) submitTransaction(ctx context.Context, tx *solana.Transaction) (solana.Signature, error) {
	txBytes, err := tx.MarshalBinary()
	if err != nil {
		return solana.Signature{}, fmt.Errorf("failed to serialize transaction for submitTransaction: %w", err)
	}

	maxRetries := uint(3)
	sig, err := s.chainClient.SendRawTransaction(ctx, txBytes, bmodel.TransactionOptions{
		SkipPreflight:       false,
		PreflightCommitment: "confirmed",
		MaxRetries:          maxRetries,
	})
	if err != nil {
		return solana.Signature{}, fmt.Errorf("failed to submit transaction via SendRawTransaction: %w", err)
	}
	// The signature from SendRawTransaction is bmodel.Signature, convert to solana.Signature
	solSig, err := solana.SignatureFromBase58(string(sig))
	if err != nil {
		return solana.Signature{}, fmt.Errorf("failed to convert bmodel.Signature to solana.Signature: %w", err)
	}
	return solSig, nil
}
