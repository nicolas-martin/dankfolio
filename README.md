# DankFolio

DankFolio is a modern, secure platform for trading and managing meme coin portfolios. Built with Go, it provides real-time trading capabilities, portfolio tracking, and social features.

## Project Structure 

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