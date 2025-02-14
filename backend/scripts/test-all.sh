#!/bin/bash

echo "🚀 Starting all API tests..."
echo "============================="

echo -e "\n🔍 Running health check tests..."
./backend/scripts/test-health.sh

echo -e "\n🔍 Running coins tests..."
./backend/scripts/test-coins.sh

echo -e "\n🔍 Running trade preview tests..."
./backend/scripts/test-trade-preview.sh

echo -e "\n🔍 Running Solana trade tests..."
echo "Running buy preview..."
./backend/scripts/solana/test-solana-buy-preview.sh
echo -e "\nRunning buy execution..."
./backend/scripts/solana/test-solana-buy-execute.sh
echo -e "\nRunning sell preview..."
./backend/scripts/solana/test-solana-sell-preview.sh
echo -e "\nRunning sell execution..."
./backend/scripts/solana/test-solana-sell-execute.sh

echo -e "\n✨ All API tests completed!" 