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

DATABASE_URL=postgres://postgres:postgres@localhost:5432/dankfolio?sslmode=disable 