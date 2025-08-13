package wallet

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// TestMultipleTradesWithDifferentCostBasis tests complex PnL scenarios
func TestMultipleTradesWithDifferentCostBasis(t *testing.T) {

	tests := []struct {
		name     string
		trades   []model.Trade
		expected struct {
			totalCostBasis    float64
			totalAmount       float64
			avgCostPerToken   float64
			shouldHaveHoldings bool
		}
	}{
		{
			name: "Multiple SOL buys at different prices",
			trades: []model.Trade{
				{
					ID:                 1,
					Type:               "swap",
					ToCoinMintAddress:  "11111111111111111111111111111111", // SOL
					Amount:             0.1,     // 0.1 SOL received
					TotalUSDCost:       18.0,    // $18 cost
					Status:             "finalized",
				},
				{
					ID:                 2,
					Type:               "swap", 
					ToCoinMintAddress:  "11111111111111111111111111111111", // SOL
					Amount:             0.05,    // 0.05 SOL received
					TotalUSDCost:       12.5,    // $12.50 cost
					Status:             "finalized",
				},
			},
			expected: struct {
				totalCostBasis    float64
				totalAmount       float64
				avgCostPerToken   float64
				shouldHaveHoldings bool
			}{
				totalCostBasis:    30.5,   // $18 + $12.50
				totalAmount:       0.15,   // 0.1 + 0.05 SOL
				avgCostPerToken:   203.33, // $30.50 / 0.15 SOL
				shouldHaveHoldings: true,
			},
		},
		{
			name: "Buy then partial sell scenario",
			trades: []model.Trade{
				{
					ID:                 3,
					Type:               "swap",
					ToCoinMintAddress:  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
					Amount:             100.0,   // 100 USDC received
					TotalUSDCost:       100.0,   // $100 cost
					Status:             "finalized",
				},
				{
					ID:                 4,
					Type:               "swap",
					FromCoinMintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
					ToCoinMintAddress:   "11111111111111111111111111111111", // SOL
					Amount:             0.25,    // 0.25 SOL received
					TotalUSDCost:       50.0,    // $50 value
					FromUSDPrice:       1.0,     // $1 per USDC
					Status:             "finalized",
				},
			},
			expected: struct {
				totalCostBasis    float64
				totalAmount       float64
				avgCostPerToken   float64
				shouldHaveHoldings bool
			}{
				totalCostBasis:    50.0,   // Remaining $50 of USDC after selling $50 worth
				totalAmount:       50.0,   // 50 USDC remaining
				avgCostPerToken:   1.0,    // $1 per USDC
				shouldHaveHoldings: true,
			},
		},
		{
			name: "Sell without previous buy (like your PENGU trade)",
			trades: []model.Trade{
				{
					ID:                  5,
					Type:                "swap",
					FromCoinMintAddress: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv", // PENGU
					ToCoinMintAddress:   "11111111111111111111111111111111", // SOL
					Amount:              0.002722453, // 0.002722453 SOL received
					TotalUSDCost:        0.54026995,  // $0.54 value
					FromUSDPrice:        0.037004848, // $0.037 per PENGU
					Status:              "finalized",
				},
			},
			expected: struct {
				totalCostBasis    float64
				totalAmount       float64
				avgCostPerToken   float64
				shouldHaveHoldings bool
			}{
				totalCostBasis:     0.0,   // No cost basis for PENGU (we sold, didn't buy)
				totalAmount:        -14.597, // Negative holdings from selling PENGU we didn't track buying
				avgCostPerToken:    0.0,
				shouldHaveHoldings: false, // Should not show in PnL due to negative holdings
			},
		},
		{
			name: "Complex scenario: Multiple buys and sells",
			trades: []model.Trade{
				// Buy 1 SOL for $180
				{
					ID:                 6,
					Type:               "swap",
					ToCoinMintAddress:  "11111111111111111111111111111111",
					Amount:             1.0,
					TotalUSDCost:       180.0,
					Status:             "finalized",
				},
				// Buy another 0.5 SOL for $100 
				{
					ID:                 7,
					Type:               "swap",
					ToCoinMintAddress:  "11111111111111111111111111111111",
					Amount:             0.5,
					TotalUSDCost:       100.0,
					Status:             "finalized",
				},
				// Sell 0.8 SOL for $160
				{
					ID:                  8,
					Type:                "swap",
					FromCoinMintAddress: "11111111111111111111111111111111",
					ToCoinMintAddress:   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
					Amount:              160.0, // 160 USDC received
					TotalUSDCost:        160.0, // $160 value
					FromUSDPrice:        200.0, // $200 per SOL when selling
					Status:              "finalized",
				},
			},
			expected: struct {
				totalCostBasis    float64
				totalAmount       float64
				avgCostPerToken   float64
				shouldHaveHoldings bool
			}{
				// Original: 1.5 SOL for $280, avg $186.67/SOL
				// Sold: 0.8 SOL (160/200), leaves 0.7 SOL
				// Proportional cost: (0.7/1.5) * $280 = $130.67
				totalCostBasis:     130.67,
				totalAmount:        0.7,
				avgCostPerToken:    186.67, // Original average cost should be preserved
				shouldHaveHoldings: true,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the cost basis calculation logic
			costBasisMap := make(map[string]struct {
				totalCost   float64
				totalAmount float64
			})

			holdings := make(map[string]float64)

			// Process each trade
			for _, trade := range tt.trades {
				// Handle buys/receives (same as the actual PnL code)
				if trade.Type == "buy" || (trade.Type == "swap" && trade.ToCoinMintAddress != "") {
					tokenID := trade.ToCoinMintAddress
					if trade.TotalUSDCost > 0 {
						data := costBasisMap[tokenID]
						data.totalCost += trade.TotalUSDCost
						data.totalAmount += trade.Amount
						costBasisMap[tokenID] = data
						holdings[tokenID] += trade.Amount
					}
				}

				// Handle sells (same as the actual PnL code)
				if trade.Type == "swap" && trade.FromCoinMintAddress != "" && trade.FromUSDPrice > 0 && trade.TotalUSDCost > 0 {
					inputAmount := trade.TotalUSDCost / trade.FromUSDPrice
					holdings[trade.FromCoinMintAddress] -= inputAmount
				}
			}

			// Test the results for the main token in the test
			var mainTokenID string
			var expectedToken string

			// Determine which token to test based on test name
			if tt.name == "Multiple SOL buys at different prices" || tt.name == "Complex scenario: Multiple buys and sells" {
				mainTokenID = "11111111111111111111111111111111" // SOL
				expectedToken = "SOL"
			} else if tt.name == "Buy then partial sell scenario" {
				mainTokenID = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
				expectedToken = "USDC"
			} else if tt.name == "Sell without previous buy (like your PENGU trade)" {
				mainTokenID = "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv" // PENGU
				expectedToken = "PENGU"
			}

			// Check cost basis data
			data, exists := costBasisMap[mainTokenID]
			holdingAmount := holdings[mainTokenID]

			t.Logf("%s Test Results:", expectedToken)
			t.Logf("  Holdings: %.6f", holdingAmount)
			t.Logf("  Cost Basis Exists: %v", exists)
			if exists {
				t.Logf("  Total Cost: $%.2f", data.totalCost)
				t.Logf("  Total Amount: %.6f", data.totalAmount)
				if data.totalAmount > 0 {
					t.Logf("  Avg Cost: $%.2f", data.totalCost/data.totalAmount)
				}
			}

			// Verify expectations
			if tt.expected.shouldHaveHoldings {
				if holdingAmount <= 0 {
					t.Errorf("Expected positive holdings, got %.6f", holdingAmount)
				}
				
				if !exists {
					t.Errorf("Expected cost basis data to exist")
					return
				}

				// Check total cost basis (within 1 cent tolerance)
				if math.Abs(data.totalCost-tt.expected.totalCostBasis) > 0.01 {
					t.Errorf("Expected total cost basis %.2f, got %.2f", 
						tt.expected.totalCostBasis, data.totalCost)
				}

				// Check average cost per token (within 1 cent tolerance)
				if data.totalAmount > 0 {
					actualAvgCost := data.totalCost / data.totalAmount
					if math.Abs(actualAvgCost-tt.expected.avgCostPerToken) > 0.01 {
						t.Errorf("Expected avg cost %.2f, got %.2f", 
							tt.expected.avgCostPerToken, actualAvgCost)
					}
				}
			} else {
				// For cases like selling without buying, holdings might be negative
				// and should not appear in PnL calculations
				if holdingAmount >= 0 && exists {
					t.Logf("Note: This case shows negative holdings (%.6f) which should be filtered out in actual PnL", holdingAmount)
				}
			}
		})
	}
}

// TestRealPenguTradeScenario tests your actual PENGU trade scenario
func TestRealPenguTradeScenario(t *testing.T) {
	ctx := context.Background()
	_ = ctx // Suppress unused variable warning

	// Your actual trade data
	penguTrade := model.Trade{
		ID:                  18,
		Type:                "swap",
		FromCoinMintAddress: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv", // PENGU
		ToCoinMintAddress:   "11111111111111111111111111111111", // SOL
		Amount:              0.002722453,                        // SOL received
		TotalUSDCost:        0.5402699492276554,                 // USD value
		FromUSDPrice:        0.03700484803367295,                // PENGU price
		ToUSDPrice:          198.44968828760508,                 // SOL price
		Status:              "finalized",
		CreatedAt:           time.Now(),
	}

	t.Logf("Analyzing real PENGU trade:")
	t.Logf("  Sold PENGU for: $%.6f", penguTrade.TotalUSDCost)
	t.Logf("  PENGU price: $%.6f", penguTrade.FromUSDPrice)
	t.Logf("  SOL received: %.9f SOL", penguTrade.Amount)
	t.Logf("  SOL price: $%.2f", penguTrade.ToUSDPrice)

	// Calculate how much PENGU was sold
	penguSold := penguTrade.TotalUSDCost / penguTrade.FromUSDPrice
	t.Logf("  PENGU amount sold: %.6f PENGU", penguSold)

	// Verify the trade makes sense
	expectedSOLReceived := penguTrade.TotalUSDCost / penguTrade.ToUSDPrice
	t.Logf("  Expected SOL received: %.9f SOL", expectedSOLReceived)
	
	if math.Abs(expectedSOLReceived-penguTrade.Amount) > 0.000001 {
		t.Errorf("SOL amount mismatch: expected %.9f, got %.9f", 
			expectedSOLReceived, penguTrade.Amount)
	}

	// Test PnL impact
	holdings := make(map[string]float64)
	costBasisMap := make(map[string]struct {
		totalCost   float64
		totalAmount float64
	})

	// Process the trade (SOL receive)
	if penguTrade.TotalUSDCost > 0 {
		data := costBasisMap[penguTrade.ToCoinMintAddress]
		data.totalCost += penguTrade.TotalUSDCost
		data.totalAmount += penguTrade.Amount
		costBasisMap[penguTrade.ToCoinMintAddress] = data
		holdings[penguTrade.ToCoinMintAddress] += penguTrade.Amount
	}

	// Process the trade (PENGU spend)
	holdings[penguTrade.FromCoinMintAddress] -= penguSold

	t.Logf("Post-trade holdings:")
	t.Logf("  SOL: %.9f SOL (cost basis: $%.6f, avg cost: $%.2f/SOL)", 
		holdings[penguTrade.ToCoinMintAddress],
		costBasisMap[penguTrade.ToCoinMintAddress].totalCost,
		costBasisMap[penguTrade.ToCoinMintAddress].totalCost / costBasisMap[penguTrade.ToCoinMintAddress].totalAmount)
	t.Logf("  PENGU: %.6f PENGU (negative - should be filtered out)", 
		holdings[penguTrade.FromCoinMintAddress])

	// Verify SOL cost basis is correct
	solData := costBasisMap[penguTrade.ToCoinMintAddress]
	expectedSOLCostBasis := penguTrade.ToUSDPrice
	actualSOLCostBasis := solData.totalCost / solData.totalAmount

	if math.Abs(actualSOLCostBasis-expectedSOLCostBasis) > 0.01 {
		t.Errorf("SOL cost basis mismatch: expected $%.2f, got $%.2f", 
			expectedSOLCostBasis, actualSOLCostBasis)
	}
}