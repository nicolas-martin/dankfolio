.PHONY: run test lint migrate-up migrate-down generate-mocks dev clean backend-kill

# Development
dev: clean setup run

setup: check-docker
	@echo "📦 Starting infrastructure..."
	@docker-compose up -d
	@echo "⏳ Waiting for PostgreSQL..."
	@sleep 5
	@echo "📝 Creating .env file..."
	@cp .env.example .env
	@echo "🗃️ Running migrations..."
	@make migrate-up

check-docker:
	@docker info > /dev/null 2>&1 || (echo "❌ Docker is not running. Please start Docker first." && exit 1)

clean:
	@echo "🧹 Cleaning up..."
	@docker-compose down -v 2>/dev/null || true
	@rm -f .env

run:
	@lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@set -a && source .env && set +a && go run cmd/api/main.go > server.log 2>&1 &
	@echo "🚀 Starting server on port 8080..."
	@for i in {1..5}; do \
		if curl -s http://localhost:8080/health > /dev/null; then \
			echo "✅ API is healthy and ready!"; \
			break; \
		fi; \
		if [ $$i -eq 5 ]; then \
			echo "❌ API failed to start. Check server.log for details"; \
			exit 1; \
		fi; \
		echo "⏳ Waiting for API to be ready... ($$i/5)"; \
		sleep 1; \
	done

test:
	@echo "🧪 Running tests..."
	@go test -v -race ./...
	@echo "✅ Tests completed"

lint:
	@echo "🔍 Running linter..."
	@golangci-lint run
	@echo "✅ Linting completed"

# Database
migrate-up:
	@echo "⬆️  Running migrations up..."
	@migrate -path internal/db/migrations -database "postgresql://postgres:postgres@localhost:5432/dankfolio?sslmode=disable" up
	@echo "✅ Migrations completed"

migrate-down:
	@echo "⬇️  Running migrations down..."
	@migrate -path internal/db/migrations -database "postgresql://postgres:postgres@localhost:5432/dankfolio?sslmode=disable" down
	@echo "✅ Migrations rolled back"

# Code generation
generate-mocks:
	@echo "🔄 Generating mocks..."
	@mockgen -source=internal/service/interfaces.go -destination=internal/mocks/service_mocks.go
	@echo "✅ Mocks generated"

# Docker
docker-build:
	@echo "🏗️  Building Docker image..."
	@docker build -t meme-trader-api .
	@echo "✅ Docker image built"

docker-run:
	@echo "🐳 Starting Docker container..."
	@docker run -p 8080:8080 --env-file .env meme-trader-api

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
