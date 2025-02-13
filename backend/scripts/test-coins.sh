#!/bin/bash

echo "🧪 Testing Coin Service..."
echo "1️⃣ Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"coin_tester","email":"coins@example.com","password":"testing123"}')
echo "$REGISTER_RESPONSE"

echo -e "\n2️⃣ Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"coins@example.com","password":"testing123"}')
echo "$LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n3️⃣ Fetching initial meme coins..."
FETCH_RESPONSE=$(curl -s -X POST http://localhost:8080/api/coins/fetch \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
echo "$FETCH_RESPONSE"

echo -e "\n4️⃣ Fetching top meme coins..."
TOP_RESPONSE=$(curl -s -X GET http://localhost:8080/api/coins/top \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
echo "$TOP_RESPONSE"

echo -e "\n5️⃣ Getting price history for a specific coin..."
COIN_ID=$(echo "$TOP_RESPONSE" | jq -r '.[0].id')
HISTORY_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/coins/$COIN_ID/history?timeframe=day" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
echo "$HISTORY_RESPONSE"

echo -e "\n6️⃣ Getting coin details by contract address..."
CONTRACT_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/coins/contract/So11111111111111111111111111111111111111112" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
echo "$CONTRACT_RESPONSE"

echo -e "\n7️⃣ Getting coin details by ID..."
ID_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/coins/$COIN_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
echo "$ID_RESPONSE"

echo -e "\n✅ Completed coin service tests" 