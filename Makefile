.PHONY: dev test clean install build run-backend test-solana backend-kill

# Variables
BACKEND_DIR := backend
DATABASE_URL := postgres://postgres:postgres@localhost:5432/dankfolio?sslmode=disable

# Default target
all: install build

# Development
dev: dev-backend

dev-backend:
	@echo "🚀 Starting development environment..."
	@cd $(BACKEND_DIR) && make dev

# Running Services
run-backend:
	@echo "🚀 Starting backend server..."
	@cd $(BACKEND_DIR) && make run

# Installation
install: 
	@echo "📦 Installing dependencies..."
	@cd $(BACKEND_DIR) && go mod download
	@echo "✅ Dependencies installed"

# Testing
test: test-backend test-solana

test-backend:
	@echo "🧪 Running backend tests..."
	@cd $(BACKEND_DIR) && make test

test-solana:
	@echo "⚡ Running Solana integration tests..."
	@cd $(BACKEND_DIR) && make test-solana-trades

# Cleaning
clean:
	@echo "🧹 Cleaning up..."
	@cd $(BACKEND_DIR) && make clean
	@echo "✅ Cleanup complete"

# Building
build:
	@echo "🏗️  Building project..."
	@cd $(BACKEND_DIR) && make check-docker && make docker-build
	@echo "✅ Build complete"

# Database
db-up:
	@echo "⬆️  Running database migrations..."
	@cd $(BACKEND_DIR) && make migrate-up

db-down:
	@echo "⬇️  Rolling back database migrations..."
	@cd $(BACKEND_DIR) && make migrate-down

# API Testing
test-api:
	@echo "🧪 Running API tests..."
	@cd $(BACKEND_DIR) && make test-api

# Coin Service Testing
test-coins:
	@echo "💰 Testing Coin Service..."
	@cd $(BACKEND_DIR) && make test-coins

# Server Management
backend-kill:
	@cd $(BACKEND_DIR) && make backend-kill

# Helpers
help:
	@echo "🛠️  Available commands:"
	@echo "  make dev          - Start development environment"
	@echo "  make test         - Run all tests"
	@echo "  make clean        - Clean up all artifacts"
	@echo "  make install      - Install dependencies"
	@echo "  make build        - Build all components"
	@echo "  make db-up        - Run database migrations"
	@echo "  make db-down      - Rollback database migrations"
	@echo "  make test-api     - Test API endpoints"
	@echo "  make run-backend  - Run the backend server"
	@echo "  make backend-kill - Stop the backend server"
	@echo "  make test-solana  - Run Solana integration tests"
	@echo "  make test-coins   - Run coin service tests" 