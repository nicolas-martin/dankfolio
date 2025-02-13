.PHONY: dev test clean install build run-backend test-solana

# Default target
all: install build

# Development
dev: dev-backend

dev-backend:
	cd backend && make dev

# Running Services
run-backend:
	@echo "🚀 Starting backend server..."
	cd backend && make run

# Installation
install: install-backend

install-backend:
	cd backend && go mod download

# Testing
test: test-backend test-solana

test-backend:
	cd backend && make test

test-solana:
	@echo "🧪 Running Solana integration tests..."
	cd backend && make test-solana-trades

# Cleaning
clean: clean-backend

clean-backend:
	cd backend && make clean

# Building
build: build-backend

build-backend:
	cd backend && make check-docker && make docker-build

# Database
db-up:
	cd backend && \
	make migrate-up

db-down:
	cd backend && \
	make migrate-down

# API Testing
test-api:
	cd backend && make test-api

# Coin Service Testing
test-coins: wait-for-server
	@echo "🧪 Testing Coin Service..."
	@echo "1️⃣ Registering test user..."
	@REGISTER_RESPONSE=$$(curl -s -X POST http://localhost:8080/api/auth/register \
		-H "Content-Type: application/json" \
		-d '{"username":"coin_tester","email":"coins@example.com","password":"testing123"}'); \
	echo "$$REGISTER_RESPONSE"; \
	if echo "$$REGISTER_RESPONSE" | grep -q "error"; then \
		echo "❌ Registration failed"; \
		exit 1; \
	fi
	
	@echo "\n2️⃣ Getting auth token..."
	@TOKEN=$$(curl -s -X POST http://localhost:8080/api/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"coins@example.com","password":"testing123"}' | \
		grep -o '"token":"[^"]*' | cut -d'"' -f4); \
	if [ -z "$$TOKEN" ]; then \
		echo "❌ Failed to get auth token"; \
		exit 1; \
	fi; \
	\
	echo "\n3️⃣ Fetching top meme coins..."; \
	TOP_COINS=$$(curl -s -X GET http://localhost:8080/api/v1/coins/top \
		-H "Authorization: Bearer $$TOKEN" \
		-H "Content-Type: application/json"); \
	echo "$$TOP_COINS"; \
	if echo "$$TOP_COINS" | grep -q "error"; then \
		echo "❌ Failed to fetch top coins"; \
		exit 1; \
	fi; \
	\
	echo "\n4️⃣ Getting price history for a specific coin..."; \
	COIN_ID=$$(echo "$$TOP_COINS" | jq -r '.[0].id // empty'); \
	if [ -n "$$COIN_ID" ]; then \
		HISTORY=$$(curl -s -X GET "http://localhost:8080/api/v1/coins/$$COIN_ID/history?timeframe=day" \
			-H "Authorization: Bearer $$TOKEN" \
			-H "Content-Type: application/json"); \
		echo "$$HISTORY"; \
	else \
		echo "⚠️ Skipping history check - no coins available"; \
	fi; \
	\
	echo "\n5️⃣ Getting coin details by contract address..."; \
	CONTRACT_RESPONSE=$$(curl -s -X GET "http://localhost:8080/api/v1/coins/contract/So11111111111111111111111111111111111111112" \
		-H "Authorization: Bearer $$TOKEN" \
		-H "Content-Type: application/json"); \
	echo "$$CONTRACT_RESPONSE"; \
	\
	echo "\n6️⃣ Getting coin details by ID..."; \
	if [ -n "$$COIN_ID" ]; then \
		COIN_DETAILS=$$(curl -s -X GET "http://localhost:8080/api/v1/coins/$$COIN_ID" \
			-H "Authorization: Bearer $$TOKEN" \
			-H "Content-Type: application/json"); \
		echo "$$COIN_DETAILS"; \
	else \
		echo "⚠️ Skipping coin details - no coin ID available"; \
	fi; \
	echo "\n✅ Completed coin service tests"

# Helpers
help:
	@echo "Available commands:"
	@echo "  make dev          - Start development environment"
	@echo "  make test         - Run all tests"
	@echo "  make clean        - Clean up all artifacts"
	@echo "  make install      - Install dependencies"
	@echo "  make build        - Build all components"
	@echo "  make db-up        - Run database migrations"
	@echo "  make db-down      - Rollback database migrations"
	@echo "  make test-api     - Test API endpoints"
	@echo "  make run-backend  - Run the backend server"
	@echo "  make test-solana  - Run Solana integration tests"
	@echo "  make test-coins   - Run coin service tests"

DATABASE_URL=postgres://postgres:postgres@localhost:5432/dankfolio?sslmode=disable 