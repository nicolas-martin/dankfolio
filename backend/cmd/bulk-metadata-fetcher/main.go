package main

import (
	"context"
	"encoding/binary"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	bin "github.com/gagliardetto/binary"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/olekukonko/tablewriter"
)

type TokenInfo struct {
	MintAddress string
	Name        string
	Symbol      string
	URI         string
	Error       string
	TokenType   string
}

var (
	TOKEN_PROGRAM_ID      = solana.MustPublicKeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
	TOKEN_2022_PROGRAM_ID = solana.MustPublicKeyFromBase58("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
)

// Token-2022 Extension Types
const (
	ExtensionTypeUninitialized      = 0
	ExtensionTypeMintCloseAuthority = 1
	ExtensionTypeTransferFeeConfig  = 2
	ExtensionTypeTokenMetadata      = 14
)

// ExtensionData represents a Token-2022 extension
type ExtensionData struct {
	ExtensionType uint16
	Length        uint16
	Data          []byte
}

// TokenMetadata represents Token-2022 metadata extension
type TokenMetadata struct {
	UpdateAuthority    [32]byte
	Mint               [32]byte
	Name               string
	Symbol             string
	URI                string
	AdditionalMetadata []AdditionalMetadata
}

type AdditionalMetadata struct {
	Key   string
	Value string
}

// MetaplexMetadata represents the on-chain metadata structure
type MetaplexMetadata struct {
	Key                 uint8
	UpdateAuthority     solana.PublicKey
	Mint                solana.PublicKey
	Data                MetaplexData
	PrimarySaleHappened bool
	IsMutable           bool
}

type MetaplexData struct {
	Name                 string
	Symbol               string
	Uri                  string
	SellerFeeBasisPoints uint16
	Creators             []Creator
}

type Creator struct {
	Address  solana.PublicKey
	Verified bool
	Share    uint8
}

func main() {
	// Parse command line arguments
	rpcURL := os.Getenv("SOLANA_RPC_ENDPOINT")
	apiKey := os.Getenv("SOLANA_RPC_API_KEY")
	timeout := 30 * time.Second // Default timeout
	concurrency := flag.Int("concurrency", 5, "Number of concurrent requests")
	flag.Parse()

	// Use the default mint addresses
	addresses := mintAddresses

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(len(addresses))*(timeout))
	defer cancel()

	// Initialize RPC client
	var rpcClient *rpc.Client
	if apiKey != "" {
		headers := map[string]string{
			"Authorization": "Bearer " + apiKey,
		}
		rpcClient = rpc.NewWithHeaders(rpcURL, headers)
		fmt.Printf("Using RPC URL with API key: %s\n", rpcURL)
	} else {
		rpcClient = rpc.New(rpcURL)
		fmt.Printf("Using RPC URL (no auth): %s\n", rpcURL)
	}

	// Metaplex Token Metadata Program ID
	metaplexProgramID := solana.MustPublicKeyFromBase58("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

	fmt.Printf("Fetching metadata for %d tokens with concurrency %d...\n\n", len(addresses), *concurrency)

	// Channel to control concurrency
	semaphore := make(chan struct{}, *concurrency)
	results := make(chan TokenInfo, len(addresses))

	// Launch goroutines
	for _, mintAddr := range addresses {
		go func(mint string) {
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			tokenInfo := TokenInfo{
				MintAddress: mint,
				Name:        "N/A",
				Symbol:      "N/A",
				URI:         "N/A",
			}

			// Create individual context with timeout for each request
			reqCtx, reqCancel := context.WithTimeout(ctx, timeout)
			defer reqCancel()

			// First check what type of token this is
			mintPubkey, err := solana.PublicKeyFromBase58(mint)
			if err != nil {
				tokenInfo.Error = fmt.Sprintf("invalid mint address: %v", err)
				results <- tokenInfo
				return
			}

			accountInfo, err := rpcClient.GetAccountInfo(reqCtx, mintPubkey)
			if err != nil {
				tokenInfo.Error = fmt.Sprintf("failed to get mint account: %v", err)
			} else if accountInfo == nil || accountInfo.Value == nil {
				tokenInfo.Error = "mint account not found"
			} else {
				owner := accountInfo.Value.Owner

				switch owner.String() {
				case TOKEN_PROGRAM_ID.String():
					tokenInfo.TokenType = "SPL"
					// Try Metaplex metadata
					metadataPDA, _, err := solana.FindProgramAddress(
						[][]byte{
							[]byte("metadata"),
							metaplexProgramID.Bytes(),
							mintPubkey.Bytes(),
						},
						metaplexProgramID,
					)
					if err != nil {
						tokenInfo.Error = fmt.Sprintf("failed to derive metadata PDA: %v", err)
					} else {
						metaAccount, err := rpcClient.GetAccountInfo(reqCtx, metadataPDA)
						if err != nil {
							tokenInfo.Error = fmt.Sprintf("failed to get metadata account: %v", err)
						} else if metaAccount == nil || metaAccount.Value == nil {
							tokenInfo.Error = "metadata account not found"
						} else {
							metadata, err := parseMetaplexMetadata(metaAccount.Value.Data.GetBinary())
							if err != nil {
								tokenInfo.Error = fmt.Sprintf("failed to parse metadata: %v", err)
							} else {
								tokenInfo.Name = strings.TrimRight(metadata.Data.Name, "\x00")
								tokenInfo.Symbol = strings.TrimRight(metadata.Data.Symbol, "\x00")
								tokenInfo.URI = strings.TrimRight(metadata.Data.Uri, "\x00")
							}
						}
					}

				case TOKEN_2022_PROGRAM_ID.String():
					tokenInfo.TokenType = "Token-2022"
					// Parse Token-2022 metadata from mint account
					data := accountInfo.Value.Data.GetBinary()
					if meta, err := parseToken2022Metadata(data); err == nil && meta != nil {
						tokenInfo.Name = meta.Name
						tokenInfo.Symbol = meta.Symbol
						tokenInfo.URI = meta.URI
					} else {
						tokenInfo.Error = fmt.Sprintf("failed to parse Token-2022 metadata: %v", err)
					}

				default:
					tokenInfo.Error = fmt.Sprintf("unknown token program: %s", owner)
				}
			}

			results <- tokenInfo
		}(mintAddr)
	}

	// Collect results
	var tokens []TokenInfo
	for i := 0; i < len(addresses); i++ {
		token := <-results
		tokens = append(tokens, token)
	}

	// Create and populate table
	table := tablewriter.NewWriter(os.Stdout)
	table.Header([]string{"SYMBOL", "MINT ADDRESS", "URI"})

	// Sort by mint address for consistent output
	for _, token := range tokens {

		// Don't truncate URI
		uri := token.URI

		table.Append([]string{
			token.Symbol,
			token.MintAddress,
			uri,
		})
	}

	fmt.Println("Token Metadata Results:")
	table.Render()

	// Summary statistics
	successCount := 0
	errorCount := 0
	for _, token := range tokens {
		if token.Error == "" {
			successCount++
		} else {
			errorCount++
		}
	}

	fmt.Printf("\n📊 Summary: %d successful, %d errors out of %d total tokens\n", successCount, errorCount, len(tokens))
}

// parseToken2022Metadata extracts metadata from Token-2022 mint account data
func parseToken2022Metadata(data []byte) (*TokenMetadata, error) {
	if len(data) < 165 {
		return nil, fmt.Errorf("mint account data too small")
	}

	// Try to parse metadata from the end of the data
	// Token-2022 can store metadata in different ways

	// Method 1: Look for metadata at the end (common pattern)
	// Try to find the metadata by looking for the update authority
	// which should be 32 bytes from a known position

	// Start from offset 165 (after basic mint data + some extensions)
	offset := 165

	// Skip to find the metadata section
	// Look for a pattern that indicates metadata start
	for offset < len(data)-100 {
		// Try to parse from this offset
		if meta, err := tryParseMetadataAt(data, offset); err == nil && meta != nil {
			return meta, nil
		}
		offset++
	}

	// Method 2: Try parsing from fixed offset patterns
	knownOffsets := []int{165, 234, 300, 366, 432}
	for _, off := range knownOffsets {
		if off < len(data) {
			if meta, err := tryParseMetadataAt(data, off); err == nil && meta != nil {
				return meta, nil
			}
		}
	}

	return nil, fmt.Errorf("metadata not found in Token-2022 account")
}

// tryParseMetadataAt attempts to parse metadata starting at a specific offset
func tryParseMetadataAt(data []byte, offset int) (*TokenMetadata, error) {
	if offset+64 > len(data) {
		return nil, fmt.Errorf("insufficient data")
	}

	meta := &TokenMetadata{}

	// Read update_authority (32 bytes)
	copy(meta.UpdateAuthority[:], data[offset:offset+32])
	offset += 32

	// Read mint (32 bytes)
	copy(meta.Mint[:], data[offset:offset+32])
	offset += 32

	// Try to read name
	name, newOffset, err := readString(data, offset)
	if err != nil || len(name) > 50 || len(name) == 0 {
		return nil, fmt.Errorf("invalid name")
	}
	meta.Name = name
	offset = newOffset

	// Try to read symbol
	symbol, newOffset, err := readString(data, offset)
	if err != nil || len(symbol) > 20 || len(symbol) == 0 {
		return nil, fmt.Errorf("invalid symbol")
	}
	meta.Symbol = symbol
	offset = newOffset

	// Try to read URI
	uri, _, err := readString(data, offset)
	if err != nil || len(uri) > 200 {
		return nil, fmt.Errorf("invalid URI")
	}
	meta.URI = uri

	// Basic validation
	if strings.Contains(meta.URI, "http") || strings.Contains(meta.URI, "ipfs") {
		return meta, nil
	}

	return nil, fmt.Errorf("invalid metadata")
}

func parseMetadataExtension(data []byte) (*TokenMetadata, error) {
	if len(data) < 64 {
		return nil, fmt.Errorf("metadata extension too small")
	}

	meta := &TokenMetadata{}

	// Read update_authority (32 bytes)
	copy(meta.UpdateAuthority[:], data[0:32])

	// Read mint (32 bytes)
	copy(meta.Mint[:], data[32:64])

	offset := 64

	// Read name
	name, newOffset, err := readString(data, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to read name: %v", err)
	}
	meta.Name = name
	offset = newOffset

	// Read symbol
	symbol, newOffset, err := readString(data, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to read symbol: %v", err)
	}
	meta.Symbol = symbol
	offset = newOffset

	// Read URI
	uri, newOffset, err := readString(data, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to read URI: %v", err)
	}
	meta.URI = uri

	return meta, nil
}

func readString(data []byte, offset int) (string, int, error) {
	if offset+4 > len(data) {
		return "", offset, fmt.Errorf("insufficient data for string length")
	}

	// Read string length (4 bytes)
	length := binary.LittleEndian.Uint32(data[offset : offset+4])
	offset += 4

	if offset+int(length) > len(data) {
		return "", offset, fmt.Errorf("insufficient data for string content")
	}

	// Read string content
	str := string(data[offset : offset+int(length)])
	offset += int(length)

	return str, offset, nil
}

// parseMetaplexMetadata parses Metaplex metadata from account data
func parseMetaplexMetadata(data []byte) (*MetaplexMetadata, error) {
	if len(data) < 1 {
		return nil, fmt.Errorf("data too short")
	}

	decoder := bin.NewBinDecoder(data)

	var metadata MetaplexMetadata

	// Read key (1 byte)
	err := decoder.Decode(&metadata.Key)
	if err != nil {
		return nil, fmt.Errorf("failed to read key: %v", err)
	}

	// Read update authority (32 bytes)
	err = decoder.Decode(&metadata.UpdateAuthority)
	if err != nil {
		return nil, fmt.Errorf("failed to read update authority: %v", err)
	}

	// Read mint (32 bytes)
	err = decoder.Decode(&metadata.Mint)
	if err != nil {
		return nil, fmt.Errorf("failed to read mint: %v", err)
	}

	// Read name length and string
	var nameLen uint32
	err = decoder.Decode(&nameLen)
	if err != nil {
		return nil, fmt.Errorf("failed to read name length: %v", err)
	}

	nameBytes := make([]byte, nameLen)
	err = decoder.Decode(&nameBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to read name: %v", err)
	}
	metadata.Data.Name = string(nameBytes)

	// Read symbol length and string
	var symbolLen uint32
	err = decoder.Decode(&symbolLen)
	if err != nil {
		return nil, fmt.Errorf("failed to read symbol length: %v", err)
	}

	symbolBytes := make([]byte, symbolLen)
	err = decoder.Decode(&symbolBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to read symbol: %v", err)
	}
	metadata.Data.Symbol = string(symbolBytes)

	// Read URI length and string
	var uriLen uint32
	err = decoder.Decode(&uriLen)
	if err != nil {
		return nil, fmt.Errorf("failed to read URI length: %v", err)
	}

	uriBytes := make([]byte, uriLen)
	err = decoder.Decode(&uriBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to read URI: %v", err)
	}
	metadata.Data.Uri = string(uriBytes)

	return &metadata, nil
}

var mintAddresses = []string{
	"Xs7xXqkcK7K8urEqGg52SECi79dRp2cEKKuYjUePYDw",
	"XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
	"Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re",
	"XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
	"Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu",
	"Xs6B6zawENwAbWVi7w92rjazLuAr5Az59qgWKcNb45x",
	"XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM",
	"Xs2yquAgsHByNzx68WJC55WHjHBvG9JsMB7CWjTLyPy",
	"XswsQk4duEQmCbGzfqUUWYmi7pV7xpJ9eEmLHXCaEQP",
	"XsNNMt7WTNA2sV3jrb1NNfNgapxRF5i4i6GcnTRRHts",
	"XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV",
	"Xsr3pdLQyXvDJBFgpR5nexCEZwXvigb8wbPYp4YoNFf",
	"XsvKCaNsxg2GN8jjUmq71qukMJr7Q1c5R2Mk9P8kcS8",
	"XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1",
	"Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu",
	"XsSr8anD1hkvNMu8XQiVcmiaTP7XGvYu7Q58LdmtE8Z",
	"XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe",
	"XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg",
	"XsaQTCgebC2KPbf27KUhdv5JFvHhQ4GDAPURwrEhAzb",
	"XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX",
	"Xsba6tUnSjDae2VcopDB6FGGDaxRrewFCDa5hKn5vT3",
	"XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
	"XsApJFV9MAktqnAc6jqzsHVujxkGm9xcSUffaBoYLKC",
	"XsfAzPzYrYjd4Dpa9BU3cusBsvWfVB9gBcyGC87S57n",
	"Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF",
	"XsAtbqkAP1HJxy7hFDeq7ok6yM43DQ9mQ1Rh861X8rw",
	"Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
	"XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ",
	"XsaHND8sHyfMfsWPj6kSdd5VwvCayZvjYgKmmcNL5qh",
	"XsczbcQ3zfcgAEt9qHQES8pxKAVG5rujPSHQEXi4kaN",
	"Xseo8tgCZfkHxWS9xbFYeKFyMSbWEvZGFV1Gh53GtCV",
	"XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2",
	"Xs151QeqTCiuKtinzfRATnUESM2xTU6V9Wy8Vy538ci",
	"XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p",
	"XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL",
	"XsMAqkcKsUewDrzVkait4e5u4y8REgtyS7jWgCpLV2C",
	"XsDgw22qRLTv5Uwuzn6T63cW69exG41T6gwQhEK22u2",
	"XsuxRGDzbLjnJ72v74b7p9VY6N66uYgTCyfwwRjVCJA",
	"Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ",
	"Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg",
	"Xs3ZFkPYT2BN7qBMqf1j1bfTeTm1rFzEFSsQ1z3wAKU",
	"XsRbLZthfABAPAfumWNEJhPyiKDW6TvDVeAeW7oKqA2",
	"Xs5UJzmCRQ8DWZjskExdSQDnbE6iLkRu2jjrRAB1JSU",
	"XszjVtyhowGjSC5odCqBpW1CtXXwXjYokymrk7fGKD3",
	"Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc",
	"XsssYEQjzxBCFgvYFFNuhJFBeHNdLWYeUSP8F45cDr9",
	"XsgaUyp4jd1fNBCxgtTKkW64xnnhQcvgaxzsbAq5ZD1",
	"XsnQnU7AdbRZYe2akqqpibDdXjkieGFfSkbkjX1Sd1X",
	"Xs8drBWy3Sd5QY3aifG9kt9KFs2K3PGZmx7jWrsrk57",
	"Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH",
	"XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo",
	"XspwhyYPdWVM8XBHZnpS9hgyag9MKjLRyE3tVfmCbSr",
	"XsHtf5RpxsQ7jeJ9ivNewouZKJHbPxhPoEy6yYvULr7",
	"XsGVi5eo1Dh2zUpic4qACcjuWGjNv8GCt3dm5XcX6Dn",
	"XsPdAVBi8Zc1xvv53k4JcMrQaEDTgkGqKYeh7AYgPHV",
	"XsjQP3iMAaQ3kQScQKthQpx9ALRbjKAjQtHg6TFomoc",
	"XswbinNKyPmzTa5CskMbCPvMW6G5CMnZXZEeQSSQoie",
	"XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4",
	"XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL",
	"XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ",
	"XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
}
