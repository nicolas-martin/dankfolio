#!/bin/bash

echo "🧪 Testing Coin Service..."

echo "1️⃣ Fetching initial meme coins..."
FETCH_RESPONSE=$(curl -s -X POST http://localhost:8080/api/coins/fetch \
    -H "Content-Type: application/json")
echo "$FETCH_RESPONSE"

echo -e "\n2️⃣ Fetching top meme coins..."
TOP_RESPONSE=$(curl -s -X GET http://localhost:8080/api/coins \
    -H "Content-Type: application/json")
echo "$TOP_RESPONSE"

echo -e "\n3️⃣ Getting price history for a specific coin..."
COIN_ID=$(echo "$TOP_RESPONSE" | jq -r '.[0].id')
HISTORY_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/coins/$COIN_ID/history?timeframe=day" \
    -H "Content-Type: application/json")
echo "$HISTORY_RESPONSE"

echo -e "\n4️⃣ Getting coin details by contract address..."
CONTRACT_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/coins/contract/So11111111111111111111111111111111111111112" \
    -H "Content-Type: application/json")
echo "$CONTRACT_RESPONSE"

echo -e "\n5️⃣ Getting coin details by ID..."
ID_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/coins/$COIN_ID" \
    -H "Content-Type: application/json")
echo "$ID_RESPONSE"

echo -e "\n✅ Completed coin service tests" 