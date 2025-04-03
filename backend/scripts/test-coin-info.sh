#!/bin/bash

# Set the API base URL
BASE_URL="http://localhost:8080"

# Colors for output
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
    echo -e "${CYAN}curl -s -X $method \"$endpoint\"${NC}"
    
    if [ -n "$payload" ]; then
        echo -e "${CYAN}    -H \"Content-Type: application/json\" \\
    -d '$payload'${NC}"
        response=$(curl -s -X $method -H "Content-Type: application/json" -d "$payload" "$endpoint")
    else
        response=$(curl -s -X $method "$endpoint")
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

# # Test getting all available tokens
# print_header "Getting all available tokens"
# test_endpoint "GET" "$BASE_URL/api/tokens" "" "Get all available tokens"

# # Test getting a specific token by ID (USDC)
# print_header "Getting specific token"
# test_endpoint "GET" "$BASE_URL/api/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" "" "Get USDC token info"

# # Test getting trade quote
# print_header "Getting trade quote"
# test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&to_coin_id=So11111111111111111111111111111111111111112&amount=1" "" "Get trade quote USDC -> SOL"

# Test getting wallet balance
print_header "Getting wallet balance"
test_endpoint "GET" "$BASE_URL/api/wallets/GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R/balance" "" "Get wallet balance"

# # Test getting price history
# print_header "Getting price history"
# test_endpoint "GET" "$BASE_URL/api/price/history?address=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&type=1D&time_from=1706745600&time_to=1707004800&address_type=token" "" "Get USDC price history"

# # Test health endpoint
# print_header "Testing health endpoint"
# test_endpoint "GET" "$BASE_URL/health" "" "Health check"

# Print summary
echo -e "\n${GREEN}All tests completed${NC}"

# Check if any test failed
if [ $? -ne 0 ]; then
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi 
