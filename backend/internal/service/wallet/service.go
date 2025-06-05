package wallet

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	associatedtokenaccount "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/google/uuid"
	solanoclient "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana" // Aliased import
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin" // Added for CoinServiceAPI
	"github.com/tyler-smith/go-bip39"
)

// Service handles wallet-related operations
type Service struct {
	rpcClient   solanoclient.SolanaRPCClientAPI // Use aliased package for the interface
	store       db.Store
	coinService coin.CoinServiceAPI // Added CoinService
}

// New creates a new wallet service
func New(rpcClient solanoclient.SolanaRPCClientAPI, store db.Store, coinService coin.CoinServiceAPI) *Service { // Accept aliased interface and CoinService
	return &Service{
		rpcClient:   rpcClient,
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

	info, err := s.rpcClient.GetAccountInfo(ctx, ata)
	if err != nil && !strings.Contains(err.Error(), "not found") {
		return solana.PublicKey{}, nil, fmt.Errorf("failed to check token account: %w", err)
	}

	var instructions []solana.Instruction
	if info == nil || info.Value == nil || info.Value.Owner.Equals(solana.SystemProgramID) {
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

	info, err := s.rpcClient.GetAccountInfo(ctx, ata)
	if err != nil && !strings.Contains(err.Error(), "not found") {
		return solana.PublicKey{}, nil, fmt.Errorf("failed to check token account: %w", err)
	}

	var instructions []solana.Instruction
	if info == nil || info.Value == nil || info.Value.Owner.Equals(solana.SystemProgramID) {
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
	mintAcct, err := s.rpcClient.GetAccountInfo(ctx, mint)
	if err != nil {
		return 0, fmt.Errorf("failed to get mint info: %w", err)
	}
	if mintAcct.Value == nil || mintAcct.Value.Data == nil {
		return 0, fmt.Errorf("invalid token mint: account not found")
	}

	var mintInfo struct {
		Type string `json:"type"`
		Info struct {
			Decimals uint8 `json:"decimals"`
		} `json:"info"`
	}

	if err := json.Unmarshal(mintAcct.Value.Data.GetRawJSON(), &mintInfo); err != nil {
		data := mintAcct.Value.Data.GetBinary()
		if len(data) < 4 {
			return 0, fmt.Errorf("invalid mint data length")
		}
		return data[4], nil
	}

	return mintInfo.Info.Decimals, nil
}

// buildTransaction creates a transaction with the given instructions
func (s *Service) buildTransaction(ctx context.Context, payer solana.PublicKey, instructions []solana.Instruction) (*solana.Transaction, error) {
	recent, err := s.rpcClient.GetLatestBlockhash(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent blockhash: %w", err)
	}
	slog.Debug("Recent blockhash obtained", "blockhash", recent.Value.Blockhash)

	tx, err := solana.NewTransaction(
		instructions,
		recent.Value.Blockhash,
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

	// Create trade record
	trade := &model.Trade{
		ID:                  fmt.Sprintf("trade_%d", time.Now().UnixNano()),
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

	// Parse transaction
	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse transaction: %w", err)
	}

	// Submit transaction with optimized options
	maxRetries := uint(3)
	sig, err := s.rpcClient.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentConfirmed,
		MaxRetries:          &maxRetries,
	})
	if err != nil {
		return "", fmt.Errorf("failed to submit transaction: %w", err)
	}

	// Find the trade record by unsigned transaction
	trade, err := s.store.Trades().GetByField(ctx, "unsigned_transaction", req.UnsignedTransaction)
	if err != nil {
		slog.Warn("Failed to find trade record", "error", err)
		return sig.String(), nil
	}

	// Update the trade record
	now := time.Now()
	trade.Status = "finalized"
	trade.TransactionHash = sig.String()
	trade.CompletedAt = &now
	trade.Finalized = true

	if err := s.store.Trades().Update(ctx, trade); err != nil {
		slog.Warn("Failed to update trade record", "error", err)
	}

	return sig.String(), nil
}

func (s *Service) GetWalletBalances(ctx context.Context, address string) (*WalletBalance, error) {
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid address: %v", err)
	}

	// Get SOL solData first
	solData, err := s.rpcClient.GetBalance(
		ctx,
		pubKey,
		rpc.CommitmentConfirmed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get SOL balance: %v", err)
	}

	// Get other token balances
	tokenBalances, err := s.getTokenBalances(ctx, address)
	if err != nil {
		return nil, fmt.Errorf("failed to get token balances: %v", err)
	}

	solValue := float64(solData.Value) / float64(solana.LAMPORTS_PER_SOL)
	var allBalances []Balance
	if solValue > 0 {
		// Only include SOL if balance is greater than zero
		solBalance := Balance{
			ID:     model.SolMint,
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

	// Get token accounts with jsonParsed encoding
	accounts, err := s.rpcClient.GetTokenAccountsByOwner(
		ctx,
		pubKey,
		&rpc.GetTokenAccountsConfig{
			ProgramId: solana.TokenProgramID.ToPointer(),
		},
		&rpc.GetTokenAccountsOpts{
			Encoding:   solana.EncodingJSONParsed,
			Commitment: rpc.CommitmentConfirmed,
		},
	)
	if err != nil {
		return []Balance{}, fmt.Errorf("failed to get token accounts: %v", err)
	}

	// First collect mint addresses and balances for tokens with positive balance
	tokens := make([]Balance, 0)
	for _, account := range accounts.Value {
		// Get the parsed token account data
		parsedData := account.Account.Data.GetRawJSON()
		if len(parsedData) == 0 {
			continue
		}

		var parsedAccount struct {
			Parsed struct {
				Info struct {
					Mint        string `json:"mint"`
					TokenAmount struct {
						UiAmount float64 `json:"uiAmount"`
					} `json:"tokenAmount"`
				} `json:"info"`
			} `json:"parsed"`
		}

		if err := json.Unmarshal(parsedData, &parsedAccount); err != nil {
			return nil, fmt.Errorf("failed to parse token account data: %w", err)
		}

		if parsedAccount.Parsed.Info.TokenAmount.UiAmount > 0 {
			tokens = append(tokens, Balance{
				ID:     parsedAccount.Parsed.Info.Mint,
				Amount: parsedAccount.Parsed.Info.TokenAmount.UiAmount,
			})
		}
	}

	return tokens, nil
}

// submitTransaction submits a signed transaction to the blockchain
func (s *Service) submitTransaction(ctx context.Context, tx *solana.Transaction) (solana.Signature, error) {
	// Submit transaction with optimized options
	maxRetries := uint(3)
	sig, err := s.rpcClient.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentConfirmed,
		MaxRetries:          &maxRetries,
	})
	if err != nil {
		return solana.Signature{}, fmt.Errorf("failed to submit transaction: %w", err)
	}

	return sig, nil
}
