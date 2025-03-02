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

// Example frontend code
async function executeTrade(fromCoin: string, toCoin: string, amount: number) {
    // 1. Create the transaction
    const transaction = await createTradeTransaction(fromCoin, toCoin, amount);
    
    // 2. Sign it locally
    const signedTx = await wallet.signTransaction(transaction);
    
    // 3. Send signed transaction to backend
    const response = await fetch('/api/v1/trades', {
    method: 'POST',
    body: JSON.stringify({
        from_coin_id: fromCoin,
        to_coin_id: toCoin,
        amount: amount,
        signed_transaction: signedTx.serialize().toString('base64')
    })
    });
}