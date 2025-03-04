#!/bin/bash

# Set the API base URL
BASE_URL="http://localhost:8080"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Token addresses
BONK_ADDRESS="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
SOL_ADDRESS="So11111111111111111111111111111111111111112"

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3

    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo -e "${CYAN}curl -s -X $method \"$endpoint\"${NC}"
    
    response=$(curl -s -X $method "$endpoint")

    # Check if the response is valid JSON
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}Response:${NC}"
        echo "$response" | jq .
    else
        echo -e "${RED}Error: Invalid JSON response${NC}"
        echo "$response"
    fi
}

# Get current time and 24 hours ago in Unix timestamp
NOW=$(date +%s)
DAY_AGO=$((NOW - 86400))

# Test OHLCV endpoint with default parameters (1H timeframe, last 24 hours)
print_header "Testing OHLCV endpoint with default parameters"
test_endpoint "GET" "$BASE_URL/api/price/ohlcv?base_address=$BONK_ADDRESS&quote_address=$SOL_ADDRESS" "Get BONK/SOL OHLCV data (1H timeframe)"

# Test with custom timeframe
print_header "Testing OHLCV endpoint with custom timeframe"
test_endpoint "GET" "$BASE_URL/api/price/ohlcv?base_address=$BONK_ADDRESS&quote_address=$SOL_ADDRESS&type=15m" "Get BONK/SOL OHLCV data (15m timeframe)"

# Test with custom time range
print_header "Testing OHLCV endpoint with custom time range"
test_endpoint "GET" "$BASE_URL/api/price/ohlcv?base_address=$BONK_ADDRESS&quote_address=$SOL_ADDRESS&time_from=$DAY_AGO&time_to=$NOW" "Get BONK/SOL OHLCV data with custom time range"

# Test error case - missing base address
print_header "Testing error case - missing base address"
test_endpoint "GET" "$BASE_URL/api/price/ohlcv?quote_address=$SOL_ADDRESS" "Error case: missing base address"

# Test error case - missing quote address
print_header "Testing error case - missing quote address"
test_endpoint "GET" "$BASE_URL/api/price/ohlcv?base_address=$BONK_ADDRESS" "Error case: missing quote address"

echo -e "\n${GREEN}All tests completed${NC}" 