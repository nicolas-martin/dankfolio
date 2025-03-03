#!/bin/bash

# Color setup for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}💱 Testing Solana sell trade execution...${NC}"

# Show the curl command
echo -e "${CYAN}curl -s -X POST http://localhost:8080/api/trades/execute \\
    -H \"Content-Type: application/json\" \\
    -d '{\"coin_id\":\"So11111111111111111111111111111111111111112\",\"type\":\"sell\",\"amount\":0.05}'${NC}"

SELL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')
echo "$SELL_RESPONSE"

echo -e "\n${GREEN}✅ Solana sell execution test completed${NC}" 