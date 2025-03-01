.PHONY: run test lint generate-mocks dev clean backend-kill

# Development
dev: clean setup run

setup:
	@echo "📝 Creating .env file..."
	@cp .env.example .env

clean:
	@echo "🧹 Cleaning up..."
	@rm -f .env

# Variables
ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
LOG_FILE := $(ROOT_DIR)/server.log

run:
	@lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@set -a && source .env && set +a && go run cmd/api/main.go

# Testing
test-api: run test-solana-trades test-coins
	@echo "🧪 Testing API endpoints..."
	@chmod +x scripts/test-api.sh
	@./scripts/test-api.sh

# Solana Trade Testing
test-solana-trades: run
	@echo "🧪 Testing Solana Trade Service..."
	@chmod +x scripts/test-solana-trades.sh
	@./scripts/test-solana-trades.sh

# Coin Service Testing
test-coins: run
	@echo "🧪 Testing Coin Service..."
	@chmod +x scripts/test-coins.sh
	@./scripts/test-coins.sh

# Server Management
backend-kill:
	@echo "🛑 Stopping backend server..."
	@lsof -ti :8080 | xargs kill -9 2>/dev/null || echo "✅ No backend server running" 
