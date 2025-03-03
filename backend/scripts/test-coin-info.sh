#!/usr/bin/env bash

echo "Testing Jupiter Token Info integration with Coin API..."
echo "======================================================"

# Base URL of your API
API_URL="http://localhost:8080/api/v1"

# Set colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}Test 1: Fetch JUP token via coin endpoint${NC}"
echo -e "Expected: Detailed information for Jupiter token (JUP)"
JUP_RESPONSE=$(curl -s "${API_URL}/coins/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN")
echo "$JUP_RESPONSE" | jq

# Check if JUP token has the right name and symbol
JUP_NAME=$(echo "$JUP_RESPONSE" | jq -r '.name')
JUP_SYMBOL=$(echo "$JUP_RESPONSE" | jq -r '.symbol')
JUP_ICON_URL=$(echo "$JUP_RESPONSE" | jq -r '.icon_url')

if [[ "$JUP_NAME" == "Jupiter" && "$JUP_SYMBOL" == "JUP" ]]; then
  echo -e "${GREEN}✓ JUP token details fetched successfully${NC}"
else
  echo -e "${RED}✗ JUP token details are incorrect or missing${NC}"
  echo "Name: $JUP_NAME"
  echo "Symbol: $JUP_SYMBOL"
  echo "Icon URL: $JUP_ICON_URL"
fi

echo -e "\n${YELLOW}Test 2: Fetch BONK token via coin endpoint${NC}"
echo -e "Expected: Detailed information for BONK token"
BONK_RESPONSE=$(curl -s "${API_URL}/coins/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")
echo "$BONK_RESPONSE" | jq

# Check if BONK token has the right name and symbol
BONK_NAME=$(echo "$BONK_RESPONSE" | jq -r '.name')
BONK_SYMBOL=$(echo "$BONK_RESPONSE" | jq -r '.symbol')
BONK_ICON_URL=$(echo "$BONK_RESPONSE" | jq -r '.icon_url')

if [[ "$BONK_NAME" == "Bonk" && "$BONK_SYMBOL" == "BONK" ]]; then
  echo -e "${GREEN}✓ BONK token details fetched successfully${NC}"
else
  echo -e "${RED}✗ BONK token details are incorrect or missing${NC}"
  echo "Name: $BONK_NAME"
  echo "Symbol: $BONK_SYMBOL"
  echo "Icon URL: $BONK_ICON_URL"
fi

echo -e "\n${YELLOW}Test 3: Fetch SOL token via coin endpoint${NC}"
echo -e "Expected: Detailed information for Solana token (SOL)"
SOL_RESPONSE=$(curl -s "${API_URL}/coins/So11111111111111111111111111111111111111112")
echo "$SOL_RESPONSE" | jq

# Check if SOL token has the right name and symbol
SOL_NAME=$(echo "$SOL_RESPONSE" | jq -r '.name')
SOL_SYMBOL=$(echo "$SOL_RESPONSE" | jq -r '.symbol')

if [[ "$SOL_NAME" == "Solana" && "$SOL_SYMBOL" == "SOL" ]]; then
  echo -e "${GREEN}✓ SOL token details fetched successfully${NC}"
else
  echo -e "${RED}✗ SOL token details are incorrect or missing${NC}"
  echo "Name: $SOL_NAME"
  echo "Symbol: $SOL_SYMBOL"
fi

echo -e "\n${YELLOW}Test 4: Test non-existent token${NC}"
echo -e "Expected: 404 Not Found response"
NON_EXISTENT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/coins/nonexistenttoken123")

if [[ "$NON_EXISTENT_RESPONSE" == "404" ]]; then
  echo -e "${GREEN}✓ Non-existent token returns 404 as expected${NC}"
else
  echo -e "${RED}✗ Non-existent token returned $NON_EXISTENT_RESPONSE instead of 404${NC}"
fi

echo -e "\n${GREEN}All tests completed!${NC}" 