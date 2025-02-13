# Mobile Meme Coin Trading App Specification

## Overview

Develop a mobile app that enables users to trade meme coins on the Solana blockchain. The app should embody a sleek, minimalist, and modern design and be available on all mobile devices (iOS, Android, etc.). All backend services are to be written in Go with PostgreSQL used as the database. The app will fetch live data from dexscreens.io, display coin information, facilitate trading operations, and manage user accounts and wallets.

## Features

### 1. Coin Listing & Details

- **Data Source:**
  - Fetch the top 50 most active meme coins from [dexscreens.io](https://dexscreens.io).
  - Retrieve and cache the following data for each coin:  
    - **Coin Name**
    - **Coin Symbol**
    - **Coin Price**
    - **Market Cap**
    - **Volume**
    - **Price Change (absolute)**
    - **Price Change Percentage**
    - **Coin Logo**

- **Main Page:**
  - Display a single list with all 50 coins.
  - Highlight the top 10 most actively traded coins within the list.
  - Include a search function that allows users to search for coins by name or symbol.

- **Coin Details Page:**
  - When a coin is selected, display:
    - A trading chart (periodically updating using a popular charting library).
    - Current coin price.
    - Market cap.
    - Volume.
    - Price change (both absolute and percentage).
    - Coin logo.
  - Provide additional information including the coin’s smart contract address.
  - Include **Buy** and **Sell** buttons to facilitate trading.
  - Use the same (cached) API endpoint as the main list.

### 2. Backend Services & Architecture

- **Backend:**
  - Write all backend services in Go.
  - Use PostgreSQL as the database.
  - Develop the API using the fastest, most popular, and flexible approach (RESTful or GraphQL—whichever is deemed optimal).
  - Integrate with the Solana blockchain using standard SDKs/libraries.
  - Implement caching for API responses where possible.

### 3. Solana Node API Integration for Trading

- **Transaction Construction:**
  - **Buy/Sell Operations:**  
    - Leverage the Solana JSON-RPC API to create and submit transactions. Use the Solana Web3 libraries (e.g., [solana-web3.js](https://solana-labs.github.io/solana-web3.js/)) to construct transactions that invoke the SPL Token Program.
    - For buying or selling, create a transaction that transfers tokens between the user’s wallet and the designated trading pool or smart contract.
    - Define transaction instructions to:
      - Specify the token mint address.
      - Determine the source and destination accounts.
      - Include parameters such as amount and token decimals.
  
- **Signing & Submission:**
  - **User Signature:**  
    - Ensure that the transaction is signed using the user’s private key, which is securely managed by the app's wallet integration.
  - **Node Submission:**  
    - Submit the signed transaction to a Solana node via the JSON-RPC endpoint. This can be either a public node or a dedicated node service.
  - **Confirmation:**  
    - After submission, poll the node for transaction confirmation to update the user interface with the trade status.
  
- **Error Handling & Caching:**
  - Implement robust error handling to manage transaction failures or network issues.
  - Cache relevant API responses to reduce the load on the Solana node and provide a smoother user experience.

### 6. Design & UX

- **User Interface:**
  - Aim for a sleek, minimalist, and modern design across all pages.
  - Focus on intuitive navigation and a user-friendly experience.

- **Performance:**
  - Ensure that market data and trading charts update periodically.
  - Optimize backend performance for responsive trading and data retrieval.

