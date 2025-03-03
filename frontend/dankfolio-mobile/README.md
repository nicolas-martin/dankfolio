# DankFolio Mobile 📱

A secure mobile app for trading meme tokens on Solana, with local transaction signing.

## 🔒 Security Features

- **Local Wallet Creation**: All wallets are generated locally on your device
- **Client-Side Signing**: Private keys never leave your device
- **Signed Transactions**: Only signed transactions are sent to the backend
- **Secure Storage**: Wallet information is stored securely (using localStorage in demo, but would use secure-storage in production)

## 🚀 Getting Started

### Prerequisites

- Node.js (14.x or higher)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository and navigate to the mobile app directory:

```bash
git clone https://github.com/your-username/dankfolio.git
cd dankfolio/frontend/mobile/dankfolio-mobile
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npx expo start
# or
yarn expo start
```

4. Run on your device or emulator:
   - iOS: Press `i` in the terminal or open the project in Xcode
   - Android: Press `a` in the terminal or open the project in Android Studio
   - Web: Press `w` in the terminal

## 🔄 Usage Flow

1. **Create or Import Wallet**: Generate a new wallet or import one with your private key
2. **Trade Memes**: Choose coins to swap and amount
3. **Sign Locally**: Transactions are signed on your device
4. **View History**: See your past trades

## 📋 Features

- **Wallet Management**: Create or import Solana wallets
- **Trade Execution**: Swap tokens securely
- **Transaction History**: View past trades
- **Local Transaction Signing**: Enhanced security with client-side signing

## 🔧 Technical Details

The app uses:
- React Native + Expo for cross-platform mobile development
- Solana Web3.js for blockchain interaction
- Local transaction signing using TweetNaCl and bs58
- Secure key storage (localStorage in demo)
- RESTful API communication with the backend

## 🔐 Security Considerations

In this implementation:
1. Private keys never leave the user's device
2. Only signed transactions are transmitted to the server
3. All cryptographic operations happen locally
4. Backend only verifies and submits the signed transaction

For a production application, additional security measures would include:
- Using a secure key storage solution like `react-native-keychain`
- Adding biometric authentication for transaction signing
- Implementing additional transaction verification on the backend
- Adding support for hardware wallets 