#!/bin/bash

echo "💱 Testing trade preview endpoint..."
PREVIEW_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$PREVIEW_RESPONSE"

echo -e "\n✅ Trade preview test completed" 