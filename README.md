# 🎮 Dankfolio

A gamified marketplace for trading digital memes on Solana.

## 📝 API Endpoints

### Wallet
- `POST /api/v1/wallets` - Create a new Solana wallet

### Trading
- `POST /api/v1/trades/execute` - Execute a trade
- `GET /api/v1/trades/{id}` - Get trade details
- `GET /api/v1/trades` - List all trades

## 🧪 Testing

```bash
# Run specific test suites
make test-api      # Test API endpoints
make test-solana   # Test Solana integration
make test-coins    # Test coin service
```
