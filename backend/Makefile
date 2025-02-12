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
	echo "🚀 Starting server..."
	go run cmd/api/main.go

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
test-api:
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