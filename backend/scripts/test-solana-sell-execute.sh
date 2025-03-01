#!/bin/bash

echo "💱 Testing Solana sell trade execution..."
SELL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')
echo "$SELL_RESPONSE"

echo -e "\n✅ Solana sell execution test completed" 