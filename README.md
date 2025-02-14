# Meme Trading Project

Welcome to the Meme Trading Project 🎉 — a gamified marketplace for trading digital memes. This project combines blockchain technology with a playful, engaging user interface to facilitate secure and efficient meme transactions.

## Architecture Overview

The backend of the Meme Trading Project is designed to support seamless meme trading by integrating blockchain operations, liquidity pool interactions, and a modular API structure. Key components include:

- **Blockchain Interaction:**  
  Utilizes the Solana blockchain for executing secure token swaps and meme trading transactions. The backend handles wallet management and transaction signing using industry-standard practices.

- **Liquidity Pool Integration:**  
  Fetches and processes pool data from the Raydium API, ensuring that trade operations use current market liquidity data for optimal execution.

- **In-Memory Data Handling:**  
  All operations are currently performed in-memory, allowing rapid prototyping and easy testing. Future releases will integrate persistent storage using dockerized Postgres instances:
  - Production DB on port 5432
  - Test DB on port 5434

- **Modular Design:**  
  The backend code is separated into distinct modules — blockchain interactions, transaction management, and API handling — which promotes code reuse and easier maintenance.

- **Testing & Continuous Integration:**  
  All API endpoints and business logic are thoroughly tested. Refer to the scripts in `./backend/scripts/` for running the test suites.

## Backend Goals

The primary objectives of the backend are to:

- **Ensure Secure and Reliable Trades:**  
  Validate meme authenticity, confirm ownership, and authenticate users before processing any transactions.

- **Provide Real-Time Trading Operations:**  
  Leverage blockchain transactions and real-time liquidity pool data to support immediate and secure meme token swaps.

- **Facilitate Future Scaling and Integration:**  
  Adopt a modular architecture that enables easy future integrations with external meme APIs, social platforms, and enhanced data storage solutions.

- **Enhance the Overall User Experience:**  
  Deliver quick, responsive interactions paired with playful feedback mechanisms (animations, transitions, etc.) that keep the trading experience exciting and engaging.

## Running the Backend

To start the backend, use one of the provided make commands:
- Run the backend directly with:
  ```
  ./backend/Makefile run
  ```
- Or use the root make command:
  ```
  ./Makefile run-backend
  ```

## Future Enhancements

- **Persistent Storage Integration:**  
  Introduce dockerized Postgres instances for production and testing, replacing in-memory storage.

- **Extended API Capabilities:**  
  Add endpoints for handling trade history, advanced asset management, and improved market analytics.

- **Rate Limiting & Spam Prevention:**  
  Implement mechanisms to prevent abuse in meme uploads and trade requests.

Happy meme trading! 🚀🎨

## Tech Stack

- **Backend**: Go 1.22+

## Project Structure

```
.
├── backend/                 # Backend Go application
│   ├── api/                 # API documentation and OpenAPI specs
│   │   ├── cmd/             # Main application entrypoints
│   │   ├── internal/        # Internal packages (api, config, errors, logger, middleware, model, service)
│   │   └── README.md        # Backend-specific documentation
│   ├── cmd/                 # Command-line tools (e.g., test-buy-token for token swap)
│   └── README.md            # Backend project documentation and run instructions (use './Makefile run-backend' or 'backend/Makefile run')
├── keys/                    # Contains wallet keypairs for mainnet and testnet
├── README.md                # Root project documentation
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