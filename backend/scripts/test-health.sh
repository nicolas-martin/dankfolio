#!/bin/bash

echo "🏥 Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health)
echo "$HEALTH_RESPONSE"

echo -e "\n✅ Health check test completed" 