#!/bin/bash

echo "🧪 Testing Solana Trade Service..."
echo "1️⃣ Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"solana_trader","email":"trader@example.com","password":"trading123"}')
echo "$REGISTER_RESPONSE"

echo -e "\n2️⃣ Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"trader@example.com","password":"trading123"}')
echo "$LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n3️⃣ Funding wallet on testnet..."
FUND_RESPONSE=$(curl -s -X POST http://localhost:8080/api/solana/testnet/fund \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
echo "$FUND_RESPONSE"

echo -e "\n4️⃣ Preview buy trade for Wrapped SOL..."
PREVIEW_BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$PREVIEW_BUY_RESPONSE"

echo -e "\n5️⃣ Execute buy trade for Wrapped SOL..."
BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$BUY_RESPONSE"

echo -e "\n6️⃣ Preview sell trade for Wrapped SOL..."
PREVIEW_SELL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')
echo "$PREVIEW_SELL_RESPONSE"

echo -e "\n7️⃣ Execute sell trade for Wrapped SOL..."
SELL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/execute \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}')
echo "$SELL_RESPONSE"

echo -e "\n8️⃣ Check trade history..."
HISTORY_RESPONSE=$(curl -s -X GET http://localhost:8080/api/trades/history \
    -H "Authorization: Bearer $TOKEN")
echo "$HISTORY_RESPONSE"

echo -e "\n✅ Completed Solana trade tests" 