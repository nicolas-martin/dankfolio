#!/bin/bash

echo "🧪 Testing Solana Trade Service..."

echo "1️⃣ Preview buy trade for Wrapped SOL..."
PREVIEW_BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$PREVIEW_BUY_RESPONSE"

echo -e "\n2️⃣ Execute buy trade for Wrapped SOL..."
BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$BUY_RESPONSE"

echo -e "\n3️⃣ Preview sell trade for Wrapped SOL..."
PREVIEW_SELL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')
echo "$PREVIEW_SELL_RESPONSE"

echo -e "\n4️⃣ Execute sell trade for Wrapped SOL..."
SELL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')
echo "$SELL_RESPONSE"

echo -e "\n✅ Completed Solana trade tests" 