# DankFolio

DankFolio is a modern, secure platform for trading and managing meme coin portfolios. Built with Go, it provides real-time trading capabilities, portfolio tracking, and social features.

## Tech Stack

- **Backend**: Go 1.22+

## Project Structure 

```
.
├── backend/                 # Backend Go application
│   ├── api/                # API documentation and OpenAPI specs
│   │   ├── cmd/                # Application entrypoints
│   │   ├── internal/           # Internal packages
│   │   │   ├── api/           # API handlers and routing
│   │   │   ├── config/        # Configuration management
│   │   │   ├── errors/        # Custom error types
│   │   │   ├── logger/        # Logging utilities
│   │   │   ├── middleware/    # HTTP middleware
│   │   │   ├── model/         # Data models
│   │   │   └── service/       # Business logic
│   │   ├── Makefile           # Build and development commands
│   │   └── README.md          # Backend-specific documentation
│   └── README.md              # Project documentation
```

## Architecture

### High-Level Overview
```
                                     ┌──────────────┐
                                     │   Frontend   │
                                     └──────┬───────┘
                                            │
                                            ▼
 ┌─────────────┐                    ┌──────────────┐
 │             │   WebSocket/HTTP   │              │
 │   Client    │◄──────────────────►│   API Layer  │
 │             │                    │              │
 └─────────────┘                    └──────┬───────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │   Services    │
                                   └───────┬───────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
             ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
             │  PostgreSQL  │    │    Redis     │    │  Blockchain  │
             │  (Storage)   │    │   (Cache)    │    │  Integration │
             └──────────────┘    └──────────────┘    └──────────────┘
 ```

### Key Components

#### API Layer
- **Router (Chi)**: Handles HTTP routing and middleware
- **WebSocket**: Real-time price updates and trading notifications
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Authentication**: JWT-based user authentication

#### Services
- **Auth Service**: User authentication and authorization
- **Trade Service**: Order matching and execution
- **Portfolio Service**: Portfolio tracking and analytics
- **Wallet Service**: Secure wallet management
- **Leaderboard Service**: User rankings and statistics

#### Data Storage
- **PostgreSQL**: Primary data storage
  - Users and authentication
  - Trading history
  - Portfolio data
  - Wallet transactions

- **Redis**: Caching and real-time data
  - Session management
  - Price caching
  - Rate limiting
  - WebSocket pub/sub

## Technical Details

### Authentication Flow
```
 ┌─────────┐                 ┌─────────┐                 ┌─────────┐
 │ Client  │                 │   API   │                 │   DB    │
 └────┬────┘                 └────┬────┘                 └────┬────┘
      │                           │                           │
      │ POST /api/auth/login     │                           │
      │ ────────────────────────►│                           │
      │                          │                           │
      │                          │ Verify Credentials        │
      │                          │ ───────────────────────► │
      │                          │                          │
      │                          │ ◄─────────────────────── │
      │                          │                          │
      │                          │ Generate JWT             │
      │                          │                          │
      │ ◄────────────────────────│                          │
      │    Token + User Info     │                          │
      │                          │                          │
 ```

### Trading Flow
```
 ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
 │ Client  │    │   API   │    │ Services │    │   DB    │
 └────┬────┘    └────┬────┘    └────┬─────┘    └────┬────┘
      │              │               │               │
      │ Trade Order  │               │               │
      │ ────────────►│               │               │
      │              │               │               │
      │              │ Validate Order│               │
      │              │ ────────────► │               │
      │              │               │               │
      │              │               │ Update Wallet │
      │              │               │ ────────────► │
      │              │               │               │
      │              │               │ Execute Trade │
      │              │               │ ────────────► │
      │              │               │               │
      │ ◄────────────│ ◄────────────│ ◄─────────── │
      │  Confirmation│               │               │
 ```

## API Documentation

The API is documented using OpenAPI/Swagger. You can access the documentation at:

- Swagger UI: `http://localhost:8080/swagger/`
- OpenAPI spec: `http://localhost:8080/swagger.yaml`

Key endpoints:
- `/api/auth/*` - Authentication endpoints
- `/api/trades/*` - Trading operations
- `/api/portfolio/*` - Portfolio management
- `/api/wallet/*` - Wallet operations
- `/api/leaderboard/*` - Leaderboard endpoints

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Chi Router](https://github.com/go-chi/chi)
- [pgx](https://github.com/jackc/pgx)
- [go-redis](https://github.com/go-redis/redis)
- [zap](https://github.com/uber-go/zap) 