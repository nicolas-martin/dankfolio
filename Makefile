.PHONY: dev setup run backend-kill test run-mobile mobile-kill help test-frontend build-backend

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
	@./setup.sh

# Server Management
run: backend-kill
	@echo "🚀 Starting backend server..."
	@cd $(BACKEND_DIR) && set -a && source .env && set +a && go run cmd/api/main.go

backend-kill:
	@echo "🛑 Stopping backend server..."
	@lsof -ti :8080 | xargs kill -9 2>/dev/null || echo "✅ No backend server running"

# Testing
test: build-backend lint-frontend test-frontend 

# Mobile App
run-mobile: mobile-kill
	@echo "📱 Starting mobile frontend..."
	@cd $(MOBILE_DIR) && yarn start

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
	@echo "  make test-frontend - Run frontend Jest tests"
	@echo "  make setup        - Set up environment files and fetches dependencies"
	@echo "  make build-backend - Build the backend server"

test-frontend: ## Run frontend Jest tests
	@echo "🧪 Running frontend tests..."
	cd frontend && yarn test

lint-frontend:
	@echo "🔍 Running frontend lint..."
	cd frontend && yarn lint

build-backend: ## Check backend Go code compilation
	@echo "🏗️ Compiling backend code..."
	cd backend && go build ./...
