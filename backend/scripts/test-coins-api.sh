#!/bin/bash

# Script to test the Coins API endpoints

BASE_URL="http://localhost:8080"

# Color setup for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Coins API endpoints...${NC}"

# Test 1: Get all coins
echo -e "\n${YELLOW}Test 1: Get all available coins${NC}"
curl -s "${BASE_URL}/api/v1/coins" | jq '.' || echo -e "${RED}Error: Failed to fetch coins${NC}"

# Test 2: Get coin by ID (SOL)
echo -e "\n${YELLOW}Test 2: Get SOL coin by ID${NC}"
curl -s "${BASE_URL}/api/v1/coins/So11111111111111111111111111111111111111112" | jq '.' || echo -e "${RED}Error: Failed to fetch SOL coin${NC}"

# Test 3: Get coin by ID (USDC)
echo -e "\n${YELLOW}Test 3: Get USDC coin by ID${NC}"
curl -s "${BASE_URL}/api/v1/coins/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" | jq '.' || echo -e "${RED}Error: Failed to fetch USDC coin${NC}"

# Test 4: Get non-existent coin (should return 404)
echo -e "\n${YELLOW}Test 4: Get non-existent coin (should return 404)${NC}"
curl -s -w "%{http_code}" "${BASE_URL}/api/v1/coins/non-existent-coin" | grep 404 > /dev/null && echo -e "${GREEN}Success: Returned 404 as expected${NC}" || echo -e "${RED}Error: Did not receive 404 status code${NC}"

echo -e "\n${GREEN}All tests completed!${NC}" 