
.PHONY: dev setup run backend-kill test mobile mobile-kill help frontend-test backend-build mocks frontend-lint proto psql psql-prod

# xcodebuild -project /Users/nma/dev/WebDriverAgent/WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination 'platform=iOS Simulator,name=iPhone 16e' test

# Variables
BACKEND_DIR := backend
MOBILE_DIR := frontend
ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
LOG_FILE := $(ROOT_DIR)/$(BACKEND_DIR)/server.log
MOCKERY_VERSION := v3.3.2

dash:
	@scp ./deploy/dashboards/* linode:/var/lib/grafana/dashboards/
	@ssh linode 'systemctl restart grafana-server.service'

# prod-build: backend-test
prod-build:
	@cd ${BACKEND_DIR} && GOOS=linux GOARCH=amd64 go build -o bin/dankfolio ./cmd/api
	@ssh linode 'sudo systemctl stop dankfolio'
	@scp ./backend/bin/dankfolio linode:/opt/dankfolio
	@scp ./backend/.env.prod linode:/etc/dankfolio/.env
	@ssh linode 'sudo systemctl start dankfolio'

# Server Management
run: backend-kill
	@echo "🚀 Starting backend server..."
	@cd $(BACKEND_DIR) && set -a && source .env && set +a && go run cmd/api/main.go

backend-kill:
	@echo "🛑 Stopping backend server..."
	@lsof -ti :9000 | xargs kill -9 2>/dev/null || echo "✅ No backend server running"

mobile: mobile-kill
	@echo "📱 Starting mobile frontend with development build..."
	@cd $(MOBILE_DIR) && yarn start:ios

run-mobile: mobile-kill
	@echo "📱 Starting mobile frontend with development build..."
	@cd $(MOBILE_DIR) && yarn start:ios

mobile-kill:
	@echo "📴 Stopping mobile frontend..."
	@pkill -f "expo start" || echo "✅ No Expo process running"
	@lsof -ti :8081 | xargs kill -9 2>/dev/null || echo "✅ No Metro bundler running"

test: backend-test frontend-test 

proto:
	@echo "Generating protobuf files..."
	@buf generate

frontend-test: frontend-lint
	@echo "🧪 Running frontend tests..."
	cd frontend && yarn test

lint: 
	@echo "🔍 Running frontend lint..."
	cd frontend && yarn lint

mocks:
	@echo "🔍 Checking mockery version..."
	@CURRENT_MOCKERY_VERSION=$$(mockery version 2>/dev/null); \
	if [ -z "$$CURRENT_MOCKERY_VERSION" ] || [ "$$CURRENT_MOCKERY_VERSION" != "$(MOCKERY_VERSION)" ]; then \
		echo "mockery not found or version mismatch. Required: $(MOCKERY_VERSION). Found: $$CURRENT_MOCKERY_VERSION"; \
		echo "Installing/Updating mockery to $(MOCKERY_VERSION)..."; \
		go install github.com/vektra/mockery/v3@$(MOCKERY_VERSION); \
	else \
		echo "✅ mockery version $(MOCKERY_VERSION) already installed."; \
	fi
	@echo "🧹 Cleaning existing mock folders..."
	@cd backend && find . -type d -name "*mocks*" -exec rm -rf {} + 2>/dev/null || true
	@echo "🔧 Generating mocks..."
	cd backend && mockery

backend-build: proto ## Check backend Go code compilation
	@echo "🏗️ Compiling backend code..."
	cd backend && go build ./...

backend-test: mocks
	@echo "🧪 Running backend tests..."
	cd backend && go test ./... -v

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

psql:
	@cd backend && set -a && source .env && set +a && psql "$$DB_URL"

psql-prod:
	@cd backend && set -a && source .env.prod && set +a && psql "$$DB_URL"

# Helpers
help:
	@echo "\033[33m🛠️  Available commands:\033[0m"
	@echo "  \033[33mmake run\033[0m          - Run the backend server (stops existing instance first)"
	@echo "  \033[33mmake mobile\033[0m   - Run the mobile frontend (stops existing instance first)"
	@echo "  \033[33mmake test\033[0m         - Run all backend and frontend tests"
	@echo "  \033[33mmake proto\033[0m        - Generate protobuf files"
	@echo "  \033[33mmake frontend-test\033[0m - Run frontend Jest tests"
	@echo "  \033[33mmake frontend-lint\033[0m - Run frontend linter"
	@echo "  \033[33mmake backend-kill\033[0m  - Stop the backend server"
	@echo "  \033[33mmake mobile-kill\033[0m   - Stop the mobile frontend"
	@echo "  \033[33mmake backend-build\033[0m - Build and check backend Go code compilation"
	@echo "  \033[33mmake backend-test\033[0m  - Run backend tests (includes build and mock generation)"
	@echo "  \033[33mmake mocks\033[0m - Generate backend mocks"
	@echo "  \033[33mmake psql\033[0m          - Connect to Postgres using DB_URL from .env"
	@echo "  \033[33mmake psql-prod\033[0m     - Connect to Production Postgres using DB_URL from .env.prod"

