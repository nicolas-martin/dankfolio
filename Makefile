.PHONY: dev setup run backend-kill test run-mobile mobile-kill help frontend-test backend-build backend-generate-mocks frontend-lint proto

# Variables
BACKEND_DIR := backend
MOBILE_DIR := frontend
ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
LOG_FILE := $(ROOT_DIR)/$(BACKEND_DIR)/server.log

# Server Management
run: backend-kill
	@echo "🚀 Starting backend server..."
	@cd $(BACKEND_DIR) && set -a && source .env && set +a && go run cmd/api/main.go

backend-kill:
	@echo "🛑 Stopping backend server..."
	@lsof -ti :9000 | xargs kill -9 2>/dev/null || echo "✅ No backend server running"

run-mobile: mobile-kill
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
	cd backend && mockery

backend-build: proto ## Check backend Go code compilation
	@echo "🏗️ Compiling backend code..."
	cd backend && go build ./...

backend-test: backend-build backend-generate-mocks ## Run backend tests
	@echo "🧪 Running backend tests..."
	cd backend && go test ./... -v

cleanup:
	DEPCHECK_OUTPUT=depcheck-output.txt
	@echo "Running depcheck..."
	@depcheck > $(DEPCHECK_OUTPUT)
	@echo "Extracting unused dependencies..."
	@./cleanup.sh < $(DEPCHECK_OUTPUT)

clean-build:
	@echo "🧹 Starting clean process..."
	@echo "   - Removing ios/build directory..."
	@rm -rf frontend/ios/build
	@echo "   - Removing ios/Pods directory..."
	@rm -rf frontend/ios/Pods
	@echo "   - Removing ios/Podfile.lock file..."
	@rm -f frontend/ios/Podfile.lock
	@echo "   - Removing node_modules directory..."
	@rm -rf frontend/node_modules
	@echo "🧼 Clean process finished."
	@echo ""
	@echo "📦 Installing dependencies..."
	@if [ -f frontend/yarn.lock ]; then \
		echo "   - Using Yarn to install JavaScript dependencies..."; \
		cd frontend && yarn install; \
	else \
		echo "   - Using npm to install JavaScript dependencies..."; \
		cd frontend && npm install; \
	fi
	@echo "   - Installing iOS Pods..."
	@cd frontend && npx pod-install
	@echo "✅ Dependencies installed."
	@echo ""
	@echo "🚀 Attempting to build and run on iOS Simulator..."
	@cd frontend && npx expo run:ios
	@echo "✅ Script finished."

# Helpers
help:
	@echo "\033[33m🛠️  Available commands:\033[0m"
	@echo "  \033[33mmake run\033[0m          - Run the backend server (stops existing instance first)"
	@echo "  \033[33mmake run-mobile\033[0m   - Run the mobile frontend (stops existing instance first)"
	@echo "  \033[33mmake test\033[0m         - Run all backend and frontend tests"
	@echo "  \033[33mmake proto\033[0m        - Generate protobuf files"
	@echo "  \033[33mmake frontend-test\033[0m - Run frontend Jest tests"
	@echo "  \033[33mmake frontend-lint\033[0m - Run frontend linter"
	@echo "  \033[33mmake backend-kill\033[0m  - Stop the backend server"
	@echo "  \033[33mmake mobile-kill\033[0m   - Stop the mobile frontend"
	@echo "  \033[33mmake backend-build\033[0m - Build and check backend Go code compilation"
	@echo "  \033[33mmake backend-test\033[0m  - Run backend tests (includes build and mock generation)"
	@echo "  \033[33mmake backend-generate-mocks\033[0m - Generate backend mocks"
