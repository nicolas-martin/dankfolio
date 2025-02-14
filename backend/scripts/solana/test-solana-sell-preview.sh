#!/bin/bash

echo "📊 Testing Solana sell trade preview..."
PREVIEW_SELL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')
echo "$PREVIEW_SELL_RESPONSE"

echo -e "\n✅ Solana sell preview test completed" 