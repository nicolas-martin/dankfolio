# Installing UI Components for DankFolio Mobile

This guide will help you install and set up the new UI components for the DankFolio Mobile app.

## Prerequisites

Make sure you have Node.js (v16 or higher) and npm/yarn installed on your system.

## Installation Steps

1. Install the required dependencies:

```bash
# Navigate to the mobile app directory
cd frontend/mobile/dankfolio-mobile

# Install dependencies
npm install
# OR
yarn install
```

## New Dependencies Added

The following new dependencies have been added to the project:

- `react-native-chart-kit`: For displaying price charts
- `react-native-svg`: Required for chart rendering
- `@expo/vector-icons`: For using Ionicons in the UI
- `expo-linear-gradient`: For gradient effects on buttons

## New Components Added

The following new components have been created:

- `CoinCard`: A reusable component to display individual coins with their prices and balances
- `PriceChart`: A component to display price history charts with timeframe selection
- `CoinDetailScreen`: A screen to display detailed information about a selected coin

## Recent UI Updates

- **TradeScreen**: Completely redesigned with a modern exchange interface featuring:
  - Clean card-based design for selecting trading pairs
  - Swap button to easily switch between coins
  - Live conversion rate display
  - Detailed fee information section
  - Gradient button for trade actions
  - Improved error handling and notifications

## Starting the App

```bash
# Start the Expo development server
npm start
# OR
yarn start
```

Then, scan the QR code with the Expo Go app on your mobile device, or press 'a' to open in an Android emulator or 'i' for iOS simulator.

## Implementation Notes

- The current implementation uses mock data for prices and charts. You will need to connect these components to real data sources.
- The CoinDetailScreen is now accessible by tapping on any coin in the HomeScreen.
- Chart data is generated randomly but could be easily connected to a real API.
- The TradeScreen now accepts `initialFromCoin` and `initialToCoin` parameters to pre-select coins when navigating from another screen. 