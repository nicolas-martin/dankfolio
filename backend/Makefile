.PHONY: run test lint migrate-up migrate-down generate-mocks

# Development
run:
	go run cmd/api/main.go

test:
	go test -v -race ./...

lint:
	golangci-lint run

# Database
migrate-up:
	migrate -path db/migrations -database "${DATABASE_URL}" up

migrate-down:
	migrate -path db/migrations -database "${DATABASE_URL}" down

# Code generation
generate-mocks:
	mockgen -source=internal/service/interfaces.go -destination=internal/mocks/service_mocks.go

# Docker
docker-build:
	docker build -t meme-trader-api .

docker-run:
	docker run -p 8080:8080 --env-file .env meme-trader-api 