package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
)

const (
	walletAddress = "GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R"
	solMintAddress = "11111111111111111111111111111111"
)

type SolanaRPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type SolanaRPCResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  struct {
		Context struct {
			Slot int64 `json:"slot"`
		} `json:"context"`
		Value int64 `json:"value"`
	} `json:"result"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func main() {
	rpcEndpoint := os.Getenv("SOLANA_RPC_ENDPOINT")
	rpcAPIKey := os.Getenv("SOLANA_RPC_API_KEY")
	devAppCheckToken := os.Getenv("DEV_APP_CHECK_TOKEN")

	if rpcEndpoint == "" || rpcAPIKey == "" || devAppCheckToken == "" {
		log.Fatal("Missing required environment variables: SOLANA_RPC_ENDPOINT, SOLANA_RPC_API_KEY, DEV_APP_CHECK_TOKEN")
	}

	fmt.Printf("🔍 Comparing SOL Balance for wallet: %s\n\n", walletAddress)

	// 1. Query Solana RPC directly
	fmt.Println("1️⃣ Querying Solana RPC Node directly...")
	solanaBalance, err := querySolanaRPCBalance(rpcEndpoint, rpcAPIKey, walletAddress)
	if err != nil {
		log.Printf("❌ Failed to query Solana RPC: %v", err)
	} else {
		fmt.Printf("✅ Solana RPC Balance: %d lamports (%.9f SOL)\n", solanaBalance, float64(solanaBalance)/1e9)
	}

	// 2. Query gRPC endpoint
	fmt.Println("\n2️⃣ Querying gRPC Wallet Service...")
	grpcBalance, err := queryGRPCBalance(devAppCheckToken, walletAddress, solMintAddress)
	if err != nil {
		log.Printf("❌ Failed to query gRPC: %v", err)
	} else {
		fmt.Printf("✅ gRPC Balance: %.9f SOL (%d lamports)\n", grpcBalance, int64(grpcBalance*1e9))
	}

	// 3. Compare results
	fmt.Println("\n📊 Comparison:")
	if err == nil && solanaBalance > 0 {
		solanaSOL := float64(solanaBalance) / 1e9
		diff := grpcBalance - solanaSOL
		diffLamports := int64(diff * 1e9)
		
		fmt.Printf("Solana RPC: %.9f SOL\n", solanaSOL)
		fmt.Printf("gRPC API:   %.9f SOL\n", grpcBalance)
		fmt.Printf("Difference: %.9f SOL (%d lamports)\n", diff, diffLamports)
		
		if diffLamports == 0 {
			fmt.Println("✅ Balances match perfectly!")
		} else if diffLamports > 0 {
			fmt.Printf("⚠️  gRPC shows %d lamports MORE than Solana RPC\n", diffLamports)
		} else {
			fmt.Printf("⚠️  gRPC shows %d lamports LESS than Solana RPC\n", -diffLamports)
		}
	}
}

func querySolanaRPCBalance(endpoint, apiKey, walletAddress string) (int64, error) {
	// Create the RPC request
	request := SolanaRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "getBalance",
		Params:  []interface{}{walletAddress},
	}

	requestBody, err := json.Marshal(request)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP client and request
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", endpoint, strings.NewReader(string(requestBody)))
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Make the request
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Parse the response
	var rpcResponse SolanaRPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResponse); err != nil {
		return 0, fmt.Errorf("failed to decode response: %w", err)
	}

	if rpcResponse.Error != nil {
		return 0, fmt.Errorf("RPC error: %s (code %d)", rpcResponse.Error.Message, rpcResponse.Error.Code)
	}

	return rpcResponse.Result.Value, nil
}

func queryGRPCBalance(devAppCheckToken, walletAddress, mintAddress string) (float64, error) {
	// Connect to gRPC server
	conn, err := grpc.Dial("localhost:9000", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return 0, fmt.Errorf("failed to connect to gRPC server: %w", err)
	}
	defer conn.Close()

	// Create wallet service client  
	client := pb.NewWalletServiceClient(conn)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create the request
	request := &pb.GetWalletBalancesRequest{
		UserPublicKey: walletAddress,
	}

	// Add Firebase App Check token to metadata
	ctx = addAppCheckToken(ctx, devAppCheckToken)

	// Make the request
	response, err := client.GetWalletBalances(ctx, request)
	if err != nil {
		return 0, fmt.Errorf("failed to get wallet balances: %w", err)
	}

	// Find SOL balance in the response
	for _, balance := range response.Balances {
		if balance.Id == mintAddress || balance.Symbol == "SOL" {
			return balance.Amount, nil
		}
	}

	return 0, fmt.Errorf("SOL balance not found in response")
}

func addAppCheckToken(ctx context.Context, token string) context.Context {
	// Add the Firebase App Check token as gRPC metadata
	md := metadata.Pairs("x-firebase-appcheck", token)
	return metadata.NewOutgoingContext(ctx, md)
}