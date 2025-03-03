#!/usr/bin/env bash

echo "Testing Jupiter Token Info API integration..."
echo "=============================================="

# Base URL of your API
API_URL="http://localhost:8080/api/v1"

# Set colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}Test 1: Fetch detailed info for JUP token${NC}"
echo -e "Expected: Detailed information for Jupiter token (JUP)"
JUP_RESPONSE=$(curl -s "${API_URL}/tokens/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/details")
echo "$JUP_RESPONSE" | jq

# Check if JUP token has the right name and symbol
JUP_NAME=$(echo "$JUP_RESPONSE" | jq -r '.name')
JUP_SYMBOL=$(echo "$JUP_RESPONSE" | jq -r '.symbol')
JUP_LOGO_URI=$(echo "$JUP_RESPONSE" | jq -r '.logoURI')

if [[ "$JUP_NAME" == "Jupiter" && "$JUP_SYMBOL" == "JUP" && "$JUP_LOGO_URI" != "" ]]; then
  echo -e "${GREEN}✓ JUP token details fetched successfully${NC}"
else
  echo -e "${RED}✗ JUP token details are incorrect or missing${NC}"
  echo "Name: $JUP_NAME"
  echo "Symbol: $JUP_SYMBOL"
  echo "Logo URI: $JUP_LOGO_URI"
fi

echo -e "\n${YELLOW}Test 2: Fetch detailed info for BONK token${NC}"
echo -e "Expected: Detailed information for BONK token"
BONK_RESPONSE=$(curl -s "${API_URL}/tokens/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/details")
echo "$BONK_RESPONSE" | jq

# Check if BONK token has the right name and symbol
BONK_NAME=$(echo "$BONK_RESPONSE" | jq -r '.name')
BONK_SYMBOL=$(echo "$BONK_RESPONSE" | jq -r '.symbol')
BONK_LOGO_URI=$(echo "$BONK_RESPONSE" | jq -r '.logoURI')

if [[ "$BONK_NAME" == "Bonk" && ("$BONK_SYMBOL" == "BONK" || "$BONK_SYMBOL" == "Bonk") && "$BONK_LOGO_URI" != "" ]]; then
  echo -e "${GREEN}✓ BONK token details fetched successfully${NC}"
else
  echo -e "${RED}✗ BONK token details are incorrect or missing${NC}"
  echo "Name: $BONK_NAME"
  echo "Symbol: $BONK_SYMBOL"
  echo "Logo URI: $BONK_LOGO_URI"
fi

echo -e "\n${YELLOW}Test 3: Compare coin endpoint with token details endpoint${NC}"
echo -e "Expected: Different responses from the two endpoints"
COIN_RESPONSE=$(curl -s "${API_URL}/coins/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN")
TOKEN_RESPONSE=$(curl -s "${API_URL}/tokens/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/details")

echo -e "\nCoin endpoint response:"
echo "$COIN_RESPONSE" | jq

echo -e "\nToken details endpoint response:"
echo "$TOKEN_RESPONSE" | jq

echo -e "\n${YELLOW}Test 4: Test non-existent token${NC}"
echo -e "Expected: 404 Not Found response"
NON_EXISTENT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/tokens/nonexistenttoken123/details")

if [[ "$NON_EXISTENT_RESPONSE" == "404" ]]; then
  echo -e "${GREEN}✓ Non-existent token returns 404 as expected${NC}"
else
  echo -e "${RED}✗ Non-existent token returned $NON_EXISTENT_RESPONSE instead of 404${NC}"
fi

echo -e "\n${GREEN}All tests completed!${NC}" 