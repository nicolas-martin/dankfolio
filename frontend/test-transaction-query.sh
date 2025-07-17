#!/bin/bash

# Test script to query transactions from the backend

BACKEND_URL="http://localhost:9000"
USER_ID="GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R"
APP_CHECK_TOKEN="951c7c245ea7e1818f3a5e6ee9f5e56e939480dc2f8f4d75696a0dbf88033b6f"

echo "Querying transactions for user: $USER_ID"
echo "====================================="

# Query transactions using curl with Connect protocol
echo "Sending request to: $BACKEND_URL/dankfolio.v1.TradeService/ListTrades"
echo ""

response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Connect-Protocol-Version: 1" \
  -H "x-firebase-appcheck: $APP_CHECK_TOKEN" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"limit\": 10,
    \"sortBy\": \"created_at\",
    \"sortDesc\": true
  }" \
  $BACKEND_URL/dankfolio.v1.TradeService/ListTrades)

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "====================================="
echo "Looking for trade data fields (price, amount, from/to coin info)..."
echo ""

# Extract specific fields if jq is available
if command -v jq &> /dev/null; then
  echo "$response" | jq '.trades[] | {
    id: .id,
    type: .type,
    status: .status,
    fromCoinId: .fromCoinId,
    toCoinId: .toCoinId,
    amount: .amount,
    price: .price,
    totalAmount: .totalAmount,
    fee: .fee,
    createdAt: .createdAt
  }'
fi