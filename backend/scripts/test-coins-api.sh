#!/bin/bash

# Script to test the Coins API endpoints

BASE_URL="http://localhost:9000"

# Color setup for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local payload=$3
    local description=$4

    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo -e "${CYAN}curl -s -X POST \"$BASE_URL/$endpoint\"${NC}"

    if [ -n "$payload" ]; then
        echo -e "${CYAN}    -H \"Content-Type: application/json\" \\
    -d '$payload'${NC}"
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "$BASE_URL/$endpoint")
    else
        response=$(curl -s -X POST "$BASE_URL/$endpoint")
    fi

    # Check if the response is valid JSON
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}Response:${NC}"
        echo "$response" | jq .
    else
        echo -e "${RED}Error: Invalid JSON response${NC}"
        echo "$response"
        return 1
    fi
}

# Test 1: Get all coins
print_header "Test 1: Get all available coins"
test_endpoint "POST" "dankfolio.v1.CoinService/GetAvailableCoins" "{}" "Get all available coins"

# Test 2: Get coin by ID (SOL)
print_header "Test 2: Get SOL coin by ID"
test_endpoint "POST" "dankfolio.v1.CoinService/GetCoinByID" "{ \"id\": \"So11111111111111111111111111111111111111112\" }" "Get SOL coin by ID"

# Test 3: Get coin by ID (USDC)
print_header "Test 3: Get USDC coin by ID"
test_endpoint "POST" "dankfolio.v1.CoinService/GetCoinByID" "{ \"id\": \"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\" }" "Get USDC coin by ID"

# Test 4: Get non-existent coin (should return 404)
print_header "Test 4: Get non-existent coin (should return 404)"
test_endpoint "POST" "dankfolio.v1.CoinService/GetCoinByID" "{ \"id\": \"xyz123\" }" "Get non-existent coin"

# Test 5: Test Jupiter API integration with popular meme coins
print_header "Test 5: Test Jupiter API integration with a popular Solana meme coin"
print_header "Fetching JUP token data:"
test_endpoint "POST" "dankfolio.v1.CoinService/GetCoinByID" "{ \"id\": \"JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN\" }" "Get JUP token data"

# Test 6: Fetch a different token directly from Jupiter API for comparison
print_header "Test 6: Raw Jupiter API response for comparison:"
echo -e "${CYAN}curl -s \"https://api.jup.ag/price/v2?ids=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN&showExtraInfo=true\"${NC}"
curl -s "https://api.jup.ag/price/v2?ids=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN&showExtraInfo=true" | python3 -m json.tool || echo -e "${RED}Error: Failed to fetch raw Jupiter API response${NC}"

echo -e "\n${GREEN}All tests completed!${NC}"