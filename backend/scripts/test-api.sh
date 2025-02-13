#!/bin/bash

echo "🧪 Testing API endpoints..."
echo "1️⃣ Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"password123"}')
echo "$REGISTER_RESPONSE"

echo -e "\n2️⃣ Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}')
echo "$LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n3️⃣ Testing portfolio endpoint..."
PORTFOLIO_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/portfolio)
echo "$PORTFOLIO_RESPONSE"

echo -e "\n✅ Completed API tests" 