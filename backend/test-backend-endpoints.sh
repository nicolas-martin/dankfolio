#!/bin/bash

# Backend API endpoint testing script
# Tests coin data and price history endpoints

echo "=== Testing Backend Endpoints ==="
echo "Testing coin address: GM2HHHgRmibkBfhWgzGe7QditC9UJJGhHWXYCTkFHpta"
echo ""

# Base URL for the backend
BASE_URL="http://localhost:9000"

# App Check Token for development
APP_CHECK_TOKEN="951c7c245ea7e1818f3a5e6ee9f5e56e939480dc2f8f4d75696a0dbf88033b6f"

echo "1. Testing SearchCoinByAddress endpoint..."
echo "========================================="
curl -X POST "$BASE_URL/dankfolio.v1.CoinService/SearchCoinByAddress" \
  -H "Content-Type: application/json" \
  -H "X-Firebase-AppCheck: $APP_CHECK_TOKEN" \
  -d '{
    "address": "GM2HHHgRmibkBfhWgzGe7QditC9UJJGhHWXYCTkFHpta"
  }' | jq '.'

echo -e "\n\n2. Testing GetCoinByID endpoint..."
echo "========================================="
curl -X POST "$BASE_URL/dankfolio.v1.CoinService/GetCoinByID" \
  -H "Content-Type: application/json" \
  -H "X-Firebase-AppCheck: $APP_CHECK_TOKEN" \
  -d '{
    "address": "GM2HHHgRmibkBfhWgzGe7QditC9UJJGhHWXYCTkFHpta"
  }' | jq '.'

echo -e "\n\n3. Testing GetPriceHistory endpoint (4H timeframe)..."
echo "========================================="
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
curl -X POST "$BASE_URL/dankfolio.v1.PriceService/GetPriceHistory" \
  -H "Content-Type: application/json" \
  -H "X-Firebase-AppCheck: $APP_CHECK_TOKEN" \
  -d '{
    "address": "GM2HHHgRmibkBfhWgzGe7QditC9UJJGhHWXYCTkFHpta",
    "type": 8,
    "time": "'$CURRENT_TIME'",
    "address_type": "token"
  }' | jq '.'

echo -e "\n\n4. Testing GetCoinsByIDs endpoint (batch request)..."
echo "========================================="
curl -X POST "$BASE_URL/dankfolio.v1.CoinService/GetCoinsByIDs" \
  -H "Content-Type: application/json" \
  -H "X-Firebase-AppCheck: $APP_CHECK_TOKEN" \
  -d '{
    "addresses": ["GM2HHHgRmibkBfhWgzGe7QditC9UJJGhHWXYCTkFHpta"]
  }' | jq '.'

echo -e "\n\n5. Testing Search endpoint (by address)..."
echo "========================================="
curl -X POST "$BASE_URL/dankfolio.v1.CoinService/Search" \
  -H "Content-Type: application/json" \
  -H "X-Firebase-AppCheck: $APP_CHECK_TOKEN" \
  -d '{
    "query": "GM2HHHgRmibkBfhWgzGe7QditC9UJJGhHWXYCTkFHpta",
    "limit": 10,
    "offset": 0
  }' | jq '.'

echo -e "\n\n6. Testing GetPriceHistory with different timeframes..."
echo "========================================="

# Test multiple timeframes
for TIMEFRAME_TYPE in 5 6 7 8 9 10 11 12 13 14; do
  echo -e "\nTesting timeframe type: $TIMEFRAME_TYPE"
  curl -s -X POST "$BASE_URL/dankfolio.v1.PriceService/GetPriceHistory" \
    -H "Content-Type: application/json" \
    -H "X-Firebase-AppCheck: $APP_CHECK_TOKEN" \
    -d '{
      "address": "GM2HHHgRmibkBfhWgzGe7QditC9UJJGhHWXYCTkFHpta",
      "type": '$TIMEFRAME_TYPE',
      "time": "'$CURRENT_TIME'",
      "address_type": "token"
    }' | jq '.data.items | length' | xargs echo "  Items returned:"
done

echo -e "\n\nAll tests completed!"