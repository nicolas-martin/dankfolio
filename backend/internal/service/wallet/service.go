package wallet

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	associatedtokenaccount "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/tyler-smith/go-bip39"
)

// Service handles wallet-related operations
type Service struct {
	rpcClient *rpc.Client
	store     db.Store
}

// New creates a new wallet service
func New(rpcClient *rpc.Client, store db.Store) *Service {
	return &Service{
		rpcClient: rpcClient,
		store:     store,
	}
}

// parseAddress safely parses a Solana address and logs the result
func (s *Service) parseAddress(address, label string) (solana.PublicKey, error) {
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		log.Printf("❌ Invalid %s address: %v\n", label, err)
		return solana.PublicKey{}, fmt.Errorf("invalid %s address: %w", label, err)
	}
	log.Printf("✅ %s address parsed: %s\n", label, pubKey)
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
		log.Printf("Creating token account: %s\n", ata)
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

// buildAndSignTransaction creates a transaction with the given instructions
func (s *Service) buildTransaction(ctx context.Context, payer solana.PublicKey, instructions []solana.Instruction) (*solana.Transaction, error) {
	recent, err := s.rpcClient.GetLatestBlockhash(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent blockhash: %w", err)
	}

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
	log.Println("Generating new Solana wallet...")

	// 1. Generate a new mnemonic phrase (12 words - 128 bits)
	entropy, err := bip39.NewEntropy(128)
	if err != nil {
		log.Fatalf("FATAL: Failed to generate entropy: %v", err)
	}
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		log.Fatalf("FATAL: Failed to generate mnemonic: %v", err)
	}
	log.Printf(" - Generated Mnemonic (SAVE THIS SECURELY!): %s\n", mnemonic)

	// 2. Generate the seed from the mnemonic
	seed := bip39.NewSeed(mnemonic, "") // Standard empty passphrase

	// 3. Create the standard library ed25519 private key (64 bytes) from the first 32 bytes of the seed.
	if len(seed) < 32 {
		log.Fatalf("FATAL: Generated seed is too short: %d bytes, expected at least 32", len(seed))
	}
	// This function returns the 64-byte key: 32-byte private scalar (derived from seed) + 32-byte public key
	stdLibPrivateKey := ed25519.NewKeyFromSeed(seed[:32])
	log.Println(" - Derived Ed25519 key material from seed.")

	// 4. Cast the standard library key (which is []byte) to solana.PrivateKey type.
	// The solana-go library uses this 64-byte format internally.
	solanaPrivateKey := solana.PrivateKey(stdLibPrivateKey)

	// 5. Get the corresponding Solana public key using the method from solana.PrivateKey
	publicKey := solanaPrivateKey.PublicKey()
	log.Printf(" - Derived Public Key: %s\n", publicKey.String())

	// 6. Save the Solana Private Key (as JSON byte array - full 64 bytes)
	// This format is directly usable by `solana-keygen verify` and other tools expecting the keypair file.
	privateKeyBytes := []byte(solanaPrivateKey) // This is the 64-byte keypair
	jsonData, err := json.Marshal(privateKeyBytes)
	if err != nil {
		log.Fatalf("FATAL: Failed to marshal private key to JSON: %v", err)
	}
	return &WalletInfo{
		PublicKey: publicKey.String(),
		SecretKey: string(jsonData),
		Mnemonic:  mnemonic,
	}, nil
}

// PrepareTransfer prepares an unsigned transfer transaction
func (s *Service) PrepareTransfer(ctx context.Context, fromAddress, toAddress, coinMint string, amount float64) (string, error) {
	log.Printf("🔄 Preparing transfer: From=%s To=%s Amount=%.9f CoinMint=%s\n",
		fromAddress, toAddress, amount, coinMint)

	from, err := s.parseAddress(fromAddress, "from")
	if err != nil {
		return "", err
	}

	to, err := s.parseAddress(toAddress, "to")
	if err != nil {
		return "", err
	}

	tx, err := s.createTokenTransfer(ctx, from, to, coinMint, amount)
	if err != nil {
		log.Printf("❌ Failed to create transfer transaction: %v\n", err)
		return "", fmt.Errorf("failed to create transfer transaction: %w", err)
	}
	log.Printf("✅ Transaction created successfully\n")

	serializedTx, err := tx.MarshalBinary()
	if err != nil {
		log.Printf("❌ Failed to serialize transaction: %v\n", err)
		return "", fmt.Errorf("failed to serialize transaction: %w", err)
	}
	log.Printf("✅ Transaction serialized successfully\n")

	encoded := base64.StdEncoding.EncodeToString(serializedTx)
	log.Printf("✅ Transaction encoded successfully (length: %d)\n", len(encoded))
	return encoded, nil
}

// createTokenTransfer creates a token transfer transaction
func (s *Service) createTokenTransfer(ctx context.Context, from, to solana.PublicKey, tokenMint string, amount float64) (*solana.Transaction, error) {
	// Handle native SOL transfer
	if tokenMint == "" {
		log.Printf("🪙 Creating SOL transfer transaction\n")
		lamports := uint64(amount * float64(solana.LAMPORTS_PER_SOL))
		log.Printf("💰 Amount in lamports: %d\n", lamports)

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
	log.Printf("📝 Transaction details:")
	log.Printf("  - Required signatures: %d", tx.Message.Header.NumRequiredSignatures)
	log.Printf("  - Read-only signers: %d", tx.Message.Header.NumReadonlySignedAccounts)
	log.Printf("  - Read-only non-signers: %d", tx.Message.Header.NumReadonlyUnsignedAccounts)
	log.Printf("  - Fee payer: %s", tx.Message.AccountKeys[0].String())

	return tx, nil
}

// SubmitTransfer submits a signed transfer transaction
func (s *Service) SubmitTransfer(ctx context.Context, signedTransaction string) (string, error) {
	// Decode signed transaction
	txBytes, err := base64.StdEncoding.DecodeString(signedTransaction)
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
		PreflightCommitment: rpc.CommitmentFinalized,
		MaxRetries:          &maxRetries,
	})
	if err != nil {
		return "", fmt.Errorf("failed to submit transaction: %w", err)
	}

	// Create initial trade record with minimal information
	trade := &model.Trade{
		ID:              fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		Type:            "transfer",
		Status:          "submitted",
		TransactionHash: sig.String(),
		CreatedAt:       time.Now(),
	}

	// Try to create the trade record, but don't fail if it doesn't work
	if err := s.store.Trades().Create(ctx, trade); err != nil {
		log.Printf("Warning: Failed to create trade record: %v", err)
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

	// Convert lamports to SOL (balance.Value is in lamports)
	// solBalance := float64(balance.Value) / 1e9

	// Get other token balances
	tokenBalances, err := s.getTokenBalances(ctx, address)
	if err != nil {
		return nil, fmt.Errorf("failed to get token balances: %v", err)
	}

	solValue := float64(solData.Value) / float64(solana.LAMPORTS_PER_SOL)
	// Create SOL token info
	solBalance := Balance{
		ID:     model.SolMint,
		Amount: solValue,
	}

	// Combine SOL with other tokens
	allBalances := append([]Balance{solBalance}, tokenBalances...)

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
