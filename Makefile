.PHONY: dev test clean install build run test-api test-solana test-coins backend-kill help run-mobile mobile-kill

# Variables
BACKEND_DIR := backend
MOBILE_DIR := frontend
ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
LOG_FILE := $(ROOT_DIR)/$(BACKEND_DIR)/server.log

# Development
dev: setup

setup:
	@echo "📝 Creating .env file..."
	@cd $(BACKEND_DIR) && cp .env.example .env
	@echo "📦 Installing dependencies..."
	@cd $(BACKEND_DIR) && go mod download
	@echo "✅ Dependencies installed"

# Server Management
run:
	@echo "🚀 Starting backend server..."
	@cd $(BACKEND_DIR) && lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@cd $(BACKEND_DIR) && set -a && source .env && set +a && go run cmd/api/main.go

backend-kill:
	@echo "🛑 Stopping backend server..."
	@lsof -ti :8080 | xargs kill -9 2>/dev/null || echo "✅ No backend server running"

# Testing
test: test-swap

test-swap:
	@echo "⚡ Running Solana integration tests..."
	@cd $(BACKEND_DIR) && ./scripts/test-solana-buy-execute.sh
	@cd $(BACKEND_DIR) && ./scripts/test-solana-sell-execute.sh

test-coins:
	@echo "🪙 Running Coins API tests..."
	@cd $(BACKEND_DIR) && ./scripts/test-coins-api.sh

# Mobile App
run-mobile:
	@echo "📱 Starting mobile frontend..."
	@cd $(MOBILE_DIR) && npm start -- --clear

mobile-kill:
	@echo "📴 Stopping mobile frontend..."
	@pkill -f "expo start" || echo "✅ No mobile server running"

# Helpers
help:
	@echo "🛠️  Available commands:"
	@echo "  make test         - Run all tests"
	@echo "  make run          - Run the backend server"
	@echo "  make run-mobile   - Run the mobile frontend"
	@echo "  make backend-kill - Stop the backend server"
	@echo "  make mobile-kill  - Stop the mobile frontend"
	@echo "  make test-swap    - Run swap service curl tests"
	@echo "  make test-coins   - Run coins API tests"
	@echo "  make setup        - Set up environment files and fetches dependencies" 
