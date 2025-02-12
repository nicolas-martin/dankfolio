#!/bin/bash
set -e  # Exit on any error

echo "🚀 Starting DankFolio backend..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting infrastructure..."
docker-compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo "🔄 Installing migrate tool..."
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

echo "📝 Creating .env file..."
cat > .env << EOL
APP_ENV=development
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/dankfolio?sslmode=disable
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET=super-secret-key-for-development-only
CORS_ORIGINS=*
EOL

echo "🗃️ Running database migrations..."
migrate -path db/migrations -database "postgres://postgres:postgres@localhost:5432/dankfolio?sslmode=disable" up

echo "📦 Installing dependencies..."
go mod download

echo "🚀 Starting the server..."
go run cmd/api/main.go 