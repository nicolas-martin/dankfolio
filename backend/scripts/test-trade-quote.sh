#!/bin/bash

# Set the API base URL
BASE_URL="http://localhost:8080"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test constants
SOL_ID="So11111111111111111111111111111111111111112"
USDC_ID="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
RAY_ID="4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"
AMOUNT="1000"

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
    fi
}

# # Test getting quote with SOL as explicit from_coin_id
# print_header "Quote: SOL -> USDC"
# test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=${SOL_ID}&to_coin_id=${USDC_ID}&amount=${AMOUNT}" "" "Get quote for SOL to USDC trade"

# # Test getting quote with SOL as implicit default currency
# print_header "Quote: Default (SOL) -> RAY"
# test_endpoint "GET" "$BASE_URL/api/trades/quote?to_coin_id=${RAY_ID}&amount=${AMOUNT}" "" "Get quote using SOL as default currency"

# Test getting quote for USDC to RAY
print_header "Quote: USDC -> RAY"
test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=${USDC_ID}&to_coin_id=${RAY_ID}&amount=${AMOUNT}" "" "Get quote for USDC to RAY trade"

# # Test error cases
# print_header "Error Cases"

# # Missing to_coin_id
# test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=${SOL_ID}&amount=${AMOUNT}" "" "Missing to_coin_id (should fail)"

# # Invalid amount
# test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=${SOL_ID}&to_coin_id=${USDC_ID}&amount=invalid" "" "Invalid amount (should fail)"

# # Invalid from_coin_id
# test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=invalid&to_coin_id=${USDC_ID}&amount=${AMOUNT}" "" "Invalid from_coin_id (should fail)"

# # Invalid to_coin_id
# test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=${SOL_ID}&to_coin_id=invalid&amount=${AMOUNT}" "" "Invalid to_coin_id (should fail)"

# # Missing amount
# test_endpoint "GET" "$BASE_URL/api/trades/quote?from_coin_id=${SOL_ID}&to_coin_id=${USDC_ID}" "" "Missing amount (should fail)"

# echo -e "\n${GREEN}All quote endpoint tests completed${NC}" 
