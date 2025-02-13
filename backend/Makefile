.PHONY: run test lint migrate-up migrate-down generate-mocks dev clean

# Development
dev: clean setup run

setup: check-docker
	echo "📦 Starting infrastructure..."
	docker-compose up -d
	echo "⏳ Waiting for PostgreSQL..."
	sleep 5
	echo "📝 Creating .env file..."
	cp .env.example .env
	echo "🗃️ Running migrations..."
	make migrate-up

check-docker:
	docker info > /dev/null 2>&1 || (echo "❌ Docker is not running. Please start Docker first." && exit 1)

clean:
	echo "🧹 Cleaning up..."
	docker-compose down -v || true
	rm -f .env

run:
	echo "🔍 Checking for existing backend processes..."
	-lsof -ti :8080 | xargs kill -9 || true
	echo "🚀 Starting server..."
	go run cmd/api/main.go > server.log 2>&1 &
	echo "⏳ Waiting for server to start..."
	# for i in $$(seq 1 30); do \
	# 	if curl -s http://localhost:8080/health > /dev/null; then \
	# 		echo "✅ Server is ready!"; \
	# 		break; \
	# 	fi; \
	# 	if [ $$i -eq 30 ]; then \
	# 		echo "❌ Server failed to start"; \
	# 		exit 1; \
	# 	fi; \
	# 	sleep 1; \
	# done

test:
	go test -v -race ./...

lint:
	golangci-lint run

# Database
migrate-up:
	migrate -path internal/db/migrations -database "postgresql://postgres:postgres@localhost:5432/dankfolio?sslmode=disable" up

migrate-down:
	migrate -path internal/db/migrations -database "postgresql://postgres:postgres@localhost:5432/dankfolio?sslmode=disable" down

# Code generation
generate-mocks:
	mockgen -source=internal/service/interfaces.go -destination=internal/mocks/service_mocks.go

# Docker
docker-build:
	docker build -t meme-trader-api .

docker-run:
	docker run -p 8080:8080 --env-file .env meme-trader-api

# Testing
test-api: run test-solana-trades test-coins
	echo "🧪 Testing API endpoints..."
	curl -s -X POST http://localhost:8080/api/auth/register \
		-H "Content-Type: application/json" \
		-d '{"username":"testuser","email":"test@example.com","password":"password123"}'
	echo "\n✅ Registered test user"
	TOKEN=$$(curl -s -X POST http://localhost:8080/api/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"test@example.com","password":"password123"}' | \
		grep -o '"token":"[^"]*' | cut -d'"' -f4); \
	curl -s -H "Authorization: Bearer $$TOKEN" http://localhost:8080/api/portfolio
	echo "\n✅ Tested authenticated endpoints"

# Solana Trade Testing
test-solana-trades: run
	@echo "🧪 Testing Solana Trade Service..."
	@echo "1️⃣ Registering test user..."
	@curl -s -X POST http://localhost:8080/api/auth/register \
		-H "Content-Type: application/json" \
		-d '{"username":"solana_trader","email":"trader@example.com","password":"trading123"}'
	
	@echo "\n2️⃣ Getting auth token..."
	@TOKEN=$$(curl -s -X POST http://localhost:8080/api/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"trader@example.com","password":"trading123"}' | \
		grep -o '"token":"[^"]*' | cut -d'"' -f4); \
	\
	echo "3️⃣ Funding wallet on testnet..."; \
	curl -s -X POST http://localhost:8080/api/v1/solana/testnet/fund \
		-H "Authorization: Bearer $$TOKEN" \
		-H "Content-Type: application/json"; \
	echo "\n"; \
	\
	echo "4️⃣ Preview buy trade for Wrapped SOL..."; \
	curl -s -X POST http://localhost:8080/api/trades/preview \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $$TOKEN" \
		-d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}'; \
	echo "\n"; \
	\
	echo "5️⃣ Execute buy trade for Wrapped SOL..."; \
	curl -s -X POST http://localhost:8080/api/trades/execute \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $$TOKEN" \
		-d '{"coin_id":"So11111111111111111111111111111111111111112","type":"buy","amount":0.1}'; \
	echo "\n"; \
	\
	echo "6️⃣ Preview sell trade for Wrapped SOL..."; \
	curl -s -X POST http://localhost:8080/api/trades/preview \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $$TOKEN" \
		-d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}'; \
	echo "\n"; \
	\
	echo "7️⃣ Execute sell trade for Wrapped SOL..."; \
	curl -s -X POST http://localhost:8080/api/trades/execute \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $$TOKEN" \
		-d '{"coin_id":"So11111111111111111111111111111111111111112","type":"sell","amount":0.05}'; \
	echo "\n"; \
	\
	echo "8️⃣ Check trade history..."; \
	curl -s -X GET http://localhost:8080/api/trades/history \
		-H "Authorization: Bearer $$TOKEN"; \
	echo "\n✅ Completed Solana trade tests"

# Coin Service Testing
test-coins: run
	@echo "🧪 Testing Coin Service..."
	@echo "1️⃣ Registering test user..."
	@curl -s -X POST http://localhost:8080/api/auth/register \
		-H "Content-Type: application/json" \
		-d '{"username":"coin_tester","email":"coins@example.com","password":"testing123"}'
	
	@echo "\n2️⃣ Getting auth token..."
	@TOKEN=$$(curl -s -X POST http://localhost:8080/api/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"coins@example.com","password":"testing123"}' | \
		grep -o '"token":"[^"]*' | cut -d'"' -f4); \
	\
	echo "\n3️⃣ Fetching top meme coins..."; \
	curl -s -X GET http://localhost:8080/api/coins/top \
		-H "Authorization: Bearer $$TOKEN" \
		-H "Content-Type: application/json"; \
	echo "\n"; \
	\
	echo "4️⃣ Getting price history for a specific coin..."; \
	COIN_ID=$$(curl -s -X GET http://localhost:8080/api/coins/top | jq -r '.[0].id'); \
	curl -s -X GET "http://localhost:8080/api/coins/$$COIN_ID/history?timeframe=day" \
		-H "Authorization: Bearer $$TOKEN" \
		-H "Content-Type: application/json"; \
	echo "\n"; \
	\
	echo "5️⃣ Getting coin details by contract address..."; \
	curl -s -X GET "http://localhost:8080/api/coins/contract/So11111111111111111111111111111111111111112" \
		-H "Authorization: Bearer $$TOKEN" \
		-H "Content-Type: application/json"; \
	echo "\n"; \
	\
	echo "6️⃣ Getting coin details by ID..."; \
	curl -s -X GET "http://localhost:8080/api/coins/$$COIN_ID" \
		-H "Authorization: Bearer $$TOKEN" \
		-H "Content-Type: application/json"; \
	echo "\n✅ Completed coin service tests" 