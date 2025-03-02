#!/bin/bash

echo "🐕 Testing WIF (Dogwifhat) buy trade execution..."

# Execute the trade
BUY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/trades \
    -H "Content-Type: application/json" \
    -d '{
    "from_coin_id": "SOL",
    "to_coin_id": "USDC",
    "amount": 1.5,
    "private_key": "<base64_encoded_private_key>"
  }')

# Extract transaction details
TX_HASH=$(echo "$BUY_RESPONSE" | jq -r '.data.transaction_hash // empty')
EXPLORER_URL=$(echo "$BUY_RESPONSE" | jq -r '.data.explorer_url // empty')
ERROR=$(echo "$BUY_RESPONSE" | jq -r '.error // empty')

# Display results
if [ ! -z "$ERROR" ]; then
    echo "❌ Trade failed: $ERROR"
    echo "Full response: $BUY_RESPONSE"
    exit 1
fi

if [ ! -z "$TX_HASH" ]; then
    echo "✅ Trade executed successfully!"
    echo "🔗 Transaction Hash: $TX_HASH"
    echo "🌐 Explorer URL: $EXPLORER_URL"
else
    echo "❌ Failed to get transaction details from response"
    echo "Response: $BUY_RESPONSE"
    exit 1
fi

echo -e "\n✅ WIF buy execution test completed" 
