#!/bin/bash

# Color setup for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Set the API base URL
BASE_URL="http://localhost:9000"

echo -e "${YELLOW}💱 Testing Solana sell trade execution...${NC}"

# Show the curl command
echo -e "${CYAN}curl -s -X POST $BASE_URL/dankfolio.v1.TradeService/ExecuteTrade \\
    -H \"Content-Type: application/json\" \\
    -d '{\"coin_id\":\"So11111111111111111111111111111111111111112\",\"type\":\"sell\",\"amount\":0.05}'${NC}"

SELL_RESPONSE=$(curl -s -X POST "$BASE_URL/dankfolio.v1.TradeService/ExecuteTrade" \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')

# Check if the response is valid JSON
if ! echo "$SELL_RESPONSE" | jq . >/dev/null 2>&1; then
    echo -e "${RED}❌ Invalid JSON response from sell execution${NC}"
    echo "$SELL_RESPONSE"
    exit 1
fi

# Extract transaction details
TX_HASH=$(echo "$SELL_RESPONSE" | jq -r '.data.transaction_hash // empty')

# Display results
if [ -z "$TX_HASH" ]; then
    echo -e "${RED}❌ Failed to get transaction details from response${NC}"
    echo -e "${RED}Response: $SELL_RESPONSE${NC}"
    exit 1
fi





echo -e "\n${GREEN}✅ Solana sell execution test completed${NC}"echo "$SELL_RESPONSE"echo -e "\n${GREEN}✅ Solana sell execution test completed${NC}"