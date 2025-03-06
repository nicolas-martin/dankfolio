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

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Function to test an endpoint with delay
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

    # Add delay between requests to avoid rate limiting
    sleep 2
}

# Get current time and 24 hours ago in Unix timestamp
NOW=$(date +%s)
DAY_AGO=$((NOW - 86400))

# # Test price history endpoint with default parameters
# print_header "Testing price history endpoint with default parameters"
# test_endpoint "GET" "$BASE_URL/api/price/history?address=$BONK_ADDRESS" "Get BONK price history (default 15m timeframe)"

# # Test with custom timeframe
# print_header "Testing price history endpoint with custom timeframe"
# test_endpoint "GET" "$BASE_URL/api/price/history?address=$BONK_ADDRESS&type=1H" "Get BONK price history (1H timeframe)"

# # Test with custom time range
# print_header "Testing price history endpoint with custom time range"
# test_endpoint "GET" "$BASE_URL/api/price/history?address=$BONK_ADDRESS&time_from=$DAY_AGO&time_to=$NOW" "Get BONK price history with custom time range"

# # Test with address type
# print_header "Testing price history endpoint with address type"
# test_endpoint "GET" "$BASE_URL/api/price/history?address=$BONK_ADDRESS&address_type=token" "Get BONK price history with explicit token type"

# Test with all parameters
print_header "Testing price history endpoint with all parameters"
test_endpoint "GET" "$BASE_URL/api/price/history?address=$BONK_ADDRESS&address_type=token&type=5m&time_from=$DAY_AGO&time_to=$NOW" "Get BONK price history with all parameters"

# # Test error cases
# print_header "Testing error cases"

# # Missing address
# test_endpoint "GET" "$BASE_URL/api/price/history" "Error case: missing address"

# # Invalid type
# test_endpoint "GET" "$BASE_URL/api/price/history?address=$BONK_ADDRESS&type=invalid" "Error case: invalid type"

# # Invalid time range (from > to)
# test_endpoint "GET" "$BASE_URL/api/price/history?address=$BONK_ADDRESS&time_from=$NOW&time_to=$DAY_AGO" "Error case: invalid time range"

echo -e "\n${GREEN}All tests completed${NC}" 
