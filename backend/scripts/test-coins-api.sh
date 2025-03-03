#!/bin/bash

# Script to test the Coins API endpoints

BASE_URL="http://localhost:8080"

# Color setup for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Coins API endpoints...${NC}"

# Test 1: Get all coins
echo -e "\n${YELLOW}Test 1: Get all available coins${NC}"
curl -s "${BASE_URL}/api/v1/coins" | python3 -m json.tool || echo -e "${RED}Error: Failed to fetch coins${NC}"

# Test 2: Get coin by ID (SOL)
echo -e "\n${YELLOW}Test 2: Get SOL coin by ID${NC}"
curl -s "${BASE_URL}/api/v1/coins/So11111111111111111111111111111111111111112" | python3 -m json.tool || echo -e "${RED}Error: Failed to fetch SOL coin${NC}"

# Test 3: Get coin by ID (USDC)
echo -e "\n${YELLOW}Test 3: Get USDC coin by ID${NC}"
curl -s "${BASE_URL}/api/v1/coins/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" | python3 -m json.tool || echo -e "${RED}Error: Failed to fetch USDC coin${NC}"

# Test 4: Get non-existent coin (should return 404)
echo -e "\n${YELLOW}Test 4: Get non-existent coin (should return 404)${NC}"
echo "Response content:"
curl -s "${BASE_URL}/api/v1/coins/xyz123"
echo ""
response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/coins/xyz123")
if [ "$response" -eq 404 ]; then
    echo -e "${GREEN}Success: Returned 404 as expected${NC}"
else
    echo -e "${RED}Error: Expected 404, got $response${NC}"
fi

# Test 5: Test Jupiter API integration with popular meme coins
echo -e "\n${YELLOW}Test 5: Test Jupiter API integration with a popular Solana meme coin${NC}"
echo -e "${YELLOW}Fetching JUP token data:${NC}"
curl -s "${BASE_URL}/api/v1/coins/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" | python3 -m json.tool || echo -e "${RED}Error: Failed to fetch JUP token data${NC}"

# Test 6: Fetch a different token directly from Jupiter API for comparison
echo -e "\n${YELLOW}Test 6: Raw Jupiter API response for comparison:${NC}"
curl -s "https://api.jup.ag/price/v2?ids=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN&showExtraInfo=true" | python3 -m json.tool || echo -e "${RED}Error: Failed to fetch raw Jupiter API response${NC}"

echo -e "\n${GREEN}All tests completed!${NC}" 