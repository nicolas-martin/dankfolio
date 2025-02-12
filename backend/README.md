# DankFolio API

## Overview
DankFolio is the ultimate platform for trading and managing your meme coin portfolio. Our API provides comprehensive endpoints for trading meme coins, managing portfolios, and competing on the leaderboard.

## Getting Started

### Prerequisites
- Go 1.19 or higher
- PostgreSQL 13 or higher
- Redis 6 or higher

### Installation
1. Clone the repository
2. Install dependencies: `go mod download`
3. Copy `.env.example` to `.env` and configure environment variables
4. Run migrations: `make migrate-up`
5. Start the server: `make run` 