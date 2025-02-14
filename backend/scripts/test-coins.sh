#!/bin/bash
echo "🪙 Testing coins endpoint..."
COINS_RESPONSE=$(curl -s http://localhost:8080/api/coins/top)
echo "$COINS_RESPONSE"
echo -e "
✅ Coins test completed"
