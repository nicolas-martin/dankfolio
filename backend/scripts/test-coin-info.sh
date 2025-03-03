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
    fi
}

# Test getting all coins
print_header "Getting all coins"
test_endpoint "GET" "$BASE_URL/api/coins" "" "Get all available coins"

# Test getting a specific coin by ID
print_header "Getting specific coin"
test_endpoint "GET" "$BASE_URL/api/coins/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" "" "Get USDC coin info"

# Test getting token details
print_header "Getting token details"
test_endpoint "GET" "$BASE_URL/api/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/details" "" "Get USDC token details"

# Test health endpoint
print_header "Testing health endpoint"
test_endpoint "GET" "$BASE_URL/health" "" "Health check"

echo -e "\n${GREEN}All tests completed${NC}" 