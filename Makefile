.PHONY: dev setup run backend-kill test run-mobile mobile-kill help frontend-test backend-build

# Variables
BACKEND_DIR := backend
MOBILE_DIR := frontend
ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
LOG_FILE := $(ROOT_DIR)/$(BACKEND_DIR)/server.log


# Server Management
run: backend-kill proto
	@echo "🚀 Starting backend server..."
	@cd $(BACKEND_DIR) && set -a && source .env && set +a && go run cmd/api/main.go

backend-kill:
	@echo "🛑 Stopping backend server..."
	@lsof -ti :9000 | xargs kill -9 2>/dev/null || echo "✅ No backend server running"

run-mobile: mobile-kill proto
	@echo "📱 Starting mobile frontend..."
	@cd $(MOBILE_DIR) && yarn start

mobile-kill:
	@echo "📴 Stopping mobile frontend..."
	@pkill -f "expo start" || echo "✅ No mobile server running"

test: backend-test frontend-test 

proto:
	@echo "Generating protobuf files..."
	@buf generate

frontend-test: proto frontend-lint
	@echo "🧪 Running frontend tests..."
	cd frontend && yarn test

frontend-lint: 
	@echo "🔍 Running frontend lint..."
	cd frontend && yarn lint

backend-generate-mocks:
	@echo "Generating mocks..."
	cd backend && go generate ./...

backend-build: proto ## Check backend Go code compilation
	@echo "🏗️ Compiling backend code..."
	cd backend && go build ./...

backend-test: backend-build backend-generate-mocks ## Run backend tests
	@echo "🧪 Running backend tests..."
	cd backend && go test ./... -v

# Helpers
help:
	@echo "🛠️  Available commands:"
	@echo "  make test         - Run all tests"
	@echo "  make run          - Run the backend server"
	@echo "  make run-mobile   - Run the mobile frontend"
	@echo "  make backend-kill - Stop the backend server"
	@echo "  make mobile-kill  - Stop the mobile frontend"
	@echo "  make frontend-test - Run frontend Jest tests"
	@echo "  make setup        - Set up environment files and fetches dependencies"
	@echo "  make backend-build - Build the backend server"
