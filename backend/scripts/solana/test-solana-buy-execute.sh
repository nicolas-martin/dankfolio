#!/bin/bash

echo "💸 Testing Solana buy trade execution..."
BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$BUY_RESPONSE"

echo -e "\n✅ Solana buy execution test completed" 