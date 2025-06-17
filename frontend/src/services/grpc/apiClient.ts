import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { WalletService } from "@/gen/dankfolio/v1/wallet_pb";
import { TradeService } from "@/gen/dankfolio/v1/trade_pb";
import { CoinService } from "@/gen/dankfolio/v1/coin_pb";
import { PriceService } from "@/gen/dankfolio/v1/price_pb";
import { UtilityService } from "@/gen/dankfolio/v1/utility_pb";
import { logger } from '@/utils/logger';
import type { Client, Interceptor } from "@connectrpc/connect";
import appCheck from '@react-native-firebase/app-check';
import { env } from '@utils/env';
import { Buffer } from 'buffer';

logger.log('🔧 API_URL from environment:', env.apiUrl);
const isDevelopmentOrSimulator = __DEV__ || env.appEnv === 'development' || env.appEnv === 'production-simulator' || env.e2eMockingEnabled;

if (!env.apiUrl) {
	const errorMsg = 'API_URL environment variable is required but not set. Please check your environment configuration.';
	logger.error('❌ Environment Error:', errorMsg);
	throw new Error(errorMsg);
}

// Authentication interceptor to add bearer tokens to all requests
const authInterceptor: Interceptor = (next) => async (req) => {
	try {
		// Bypass Firebase App Check in development/simulator/e2e environments
		if (isDevelopmentOrSimulator) {
			logger.info('🔐 Using hardcoded Firebase App Check token for development/simulator/e2e environment');
			if (!env.devAppCheckToken) {
				logger.error('❌ devAppCheckToken is not set in environment variables for development/simulator/e2e environment');
			} else {
				req.header.set('X-Firebase-AppCheck', env.devAppCheckToken);
			}
			return next(req);
		}

		// Production environment - get real Firebase App Check token
		const appCheckToken = await appCheck().getToken(false);
		logger.info('🔐 Retrieved Firebase App Check token for production');

		if (appCheckToken && appCheckToken.token) {
			// Log token details for debugging (only show the first part)
			const token = appCheckToken.token;
			const parts = token.split('.');

			if (parts.length === 3) {
				// Only decode and log the header and a small portion of the payload
				try {
					// Decode the header
					const headerBase64 = parts[0];
					const headerJson = Buffer.from(headerBase64, 'base64').toString('utf8');
					logger.info('🔐 App Check token header:', headerJson);

					// Try to get audience from payload
					const payloadBase64 = parts[1];
					const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
					const payload = JSON.parse(payloadJson);

					// Log important fields like audience and issuer
					if (payload.aud) {
						logger.info('🔐 App Check token audience:', payload.aud);
					}
					if (payload.iss) {
						logger.info('🔐 App Check token issuer:', payload.iss);
					}
				} catch (error: unknown) {
					if (error instanceof Error) {
						logger.warn('🔐 Could not parse App Check token:', error.message);
					} else {
						logger.warn("An unknown error occurred while parsing App Check token:", error);
					}
				}
			}

			logger.info(`🔐 Adding Firebase App Check token to request: ${req.url}`);
			req.header.set('X-Firebase-AppCheck', appCheckToken.token);
		} else {
			logger.warn(`🔐 No Firebase App Check token available for request to: ${req.url}`);
		}
	} catch (error: unknown) {
		if (error instanceof Error) {
			logger.error('❌ Failed to get Firebase App Check token for request:', error.message);
		} else {
			logger.error("An unknown error occurred while getting Firebase App Check token:", error);
		}
	}

	return next(req);
};

// Check if mocking is enabled to decide how to create clients
const shouldMock = process.env.E2E_MOCKING_ENABLED === 'true' || __DEV__;

let walletClient: Client<typeof WalletService>, tradeClient: Client<typeof TradeService>, coinClient: Client<typeof CoinService>, priceClient: Client<typeof PriceService>, utilityClient: Client<typeof UtilityService>;

if (shouldMock) {
	logger.log('🎭 Creating gRPC clients with custom fetch for mocking');

	// Create transport with custom fetch function for mocking
	const transport = createConnectTransport({
		baseUrl: env.apiUrl,
		interceptors: [authInterceptor],
		fetch: (...args) => global.fetch(...args), // Dynamically resolve to current global.fetch
	});

	walletClient = createClient(WalletService, transport);
	tradeClient = createClient(TradeService, transport);
	coinClient = createClient(CoinService, transport);
	priceClient = createClient(PriceService, transport);
	utilityClient = createClient(UtilityService, transport);
} else {
	logger.log('🔧 Creating gRPC clients with standard transport');

	// Create standard transport for production
	const transport = createConnectTransport({
		baseUrl: env.apiUrl,
		interceptors: [authInterceptor],
	});

	walletClient = createClient(WalletService, transport);
	tradeClient = createClient(TradeService, transport);
	coinClient = createClient(CoinService, transport);
	priceClient = createClient(PriceService, transport);
	utilityClient = createClient(UtilityService, transport);
}

export { walletClient, tradeClient, coinClient, priceClient, utilityClient };

