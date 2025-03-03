#!/bin/bash

# Color setup for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🐕 Testing WIF (Dogwifhat) buy trade execution...${NC}"

# Show the curl command
echo -e "${CYAN}curl -s -X POST http://localhost:8080/api/trades/execute \\
    -H \"Content-Type: application/json\" \\
    -d '{
    \"from_coin_id\": \"SOL\",
    \"to_coin_id\": \"USDC\",
    \"amount\": 1.5,
    \"private_key\": \"<base64_encoded_private_key>\"
}'${NC}"

# Execute the trade
BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -d '{
    "from_coin_id": "SOL",
    "to_coin_id": "USDC",
    "amount": 1.5,
    "private_key": "<base64_encoded_private_key>"
  }')

# Extract transaction details
TX_HASH=$(echo "$BUY_RESPONSE" | jq -r '.data.transaction_hash // empty')
EXPLORER_URL=$(echo "$BUY_RESPONSE" | jq -r '.data.explorer_url // empty')
ERROR=$(echo "$BUY_RESPONSE" | jq -r '.error // empty')

# Display results
if [ ! -z "$ERROR" ]; then
    echo -e "${RED}❌ Trade failed: $ERROR${NC}"
    echo -e "${RED}Full response: $BUY_RESPONSE${NC}"
    exit 1
fi

if [ ! -z "$TX_HASH" ]; then
    echo -e "${GREEN}✅ Trade executed successfully!${NC}"
    echo -e "${GREEN}🔗 Transaction Hash: $TX_HASH${NC}"
    echo -e "${GREEN}🌐 Explorer URL: $EXPLORER_URL${NC}"
else
    echo -e "${RED}❌ Failed to get transaction details from response${NC}"
    echo -e "${RED}Response: $BUY_RESPONSE${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ WIF buy execution test completed${NC}" 
