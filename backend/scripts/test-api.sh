#!/bin/bash

echo "🧪 Testing API endpoints..."

echo "1️⃣ Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health)
echo "$HEALTH_RESPONSE"

echo -e "\n2️⃣ Testing coins endpoint..."
COINS_RESPONSE=$(curl -s http://localhost:8080/api/coins)
echo "$COINS_RESPONSE"

echo -e "\n3️⃣ Testing trade preview endpoint..."
PREVIEW_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades/preview \
    -H "Content-Type: application/json" \
    -d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}')
echo "$PREVIEW_RESPONSE"

echo -e "\n✅ Completed API tests" 