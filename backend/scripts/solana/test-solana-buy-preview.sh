#!/bin/bash

echo "💰 Testing Solana buy trade preview..."
PREVIEW_BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$PREVIEW_BUY_RESPONSE"

echo -e "\n✅ Solana buy preview test completed" 