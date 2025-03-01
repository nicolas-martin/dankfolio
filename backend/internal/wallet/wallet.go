package wallet

import (
	"github.com/gagliardetto/solana-go"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// CreateSolanaWallet creates a new Solana wallet and returns the wallet information
func CreateSolanaWallet() (*model.Wallet, error) {
	// Generate new Solana wallet
	wallet := solana.NewWallet()

	// Create wallet model
	walletModel := &model.Wallet{
		PublicKey: wallet.PublicKey().String(),
		SecretKey: wallet.PrivateKey.String(),
	}

	return walletModel, nil
}
