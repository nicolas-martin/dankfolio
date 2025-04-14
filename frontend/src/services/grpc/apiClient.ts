import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

// Import service definitions from generated code
import { CoinService } from "../../gen/dankfolio/v1/coin_connect";
import { PriceService } from "../../gen/dankfolio/v1/price_connect";
import { TradeService } from "../../gen/dankfolio/v1/trade_connect";
import { WalletService } from "../../gen/dankfolio/v1/wallet_connect";

// TODO: Make this configurable, potentially via environment variables
const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

// Configure the transport (using Connect-Web for browser/React Native)
const transport = createConnectTransport({
  baseUrl: baseUrl,
});

// Create clients for each service
export const coinClient = createClient(CoinService, transport);
export const priceClient = createClient(PriceService, transport);
export const tradeClient = createClient(TradeService, transport);
export const walletClient = createClient(WalletService, transport);

// Optional: Add an interceptor for the X-Debug-Mode header if needed globally
// const debugInterceptor = (next) => async (req) => {
//   // Logic to determine if debug mode should be enabled
//   const isDebugMode = true; // Replace with actual logic (e.g., check a global state)
//   if (isDebugMode) {
//     req.header.set("X-Debug-Mode", "true");
//   }
//   return await next(req);
// };

// const transportWithDebug = createConnectTransport({
//   baseUrl: baseUrl,
//   interceptors: [debugInterceptor], // Add interceptor here
// });

// export const tradeClientWithDebug = createClient(TradeService, transportWithDebug);
// export const priceClientWithDebug = createClient(PriceService, transportWithDebug); // etc.