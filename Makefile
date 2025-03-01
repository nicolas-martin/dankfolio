.PHONY: dev test clean install build run test-api test-solana test-coins backend-kill help

# Variables
BACKEND_DIR := backend
ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
LOG_FILE := $(ROOT_DIR)/$(BACKEND_DIR)/server.log

# Development
dev: clean setup run

setup:
	@echo "📝 Creating .env file..."
	@cd $(BACKEND_DIR) && cp .env.example .env

clean:
	@echo "🧹 Cleaning up..."
	@cd $(BACKEND_DIR) && rm -f .env
	@echo "✅ Cleanup complete"

# Installation
install: 
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
test: test-api test-solana test-coins

test-api:
	@echo "🧪 Testing API endpoints..."
	@cd $(BACKEND_DIR) && chmod +x scripts/test-api.sh
	@cd $(BACKEND_DIR) && ./scripts/test-api.sh

test-solana:
	@echo "⚡ Running Solana integration tests..."
	@cd $(BACKEND_DIR) && chmod +x scripts/test-solana-trades.sh
	@cd $(BACKEND_DIR) && ./scripts/test-solana-trades.sh

test-coins:
	@echo "💰 Testing Coin Service..."
	@cd $(BACKEND_DIR) && chmod +x scripts/test-coins.sh
	@cd $(BACKEND_DIR) && ./scripts/test-coins.sh

# Helpers
help:
	@echo "🛠️  Available commands:"
	@echo "  make dev          - Start development environment"
	@echo "  make test         - Run all tests"
	@echo "  make clean        - Clean up all artifacts"
	@echo "  make install      - Install dependencies"
	@echo "  make run          - Run the backend server"
	@echo "  make backend-kill - Stop the backend server"
	@echo "  make test-api     - Test API endpoints"
	@echo "  make test-solana  - Run Solana integration tests"
	@echo "  make test-coins   - Run coin service tests"
	@echo "  make setup        - Set up environment files" 
