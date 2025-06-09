import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { WalletService } from "@/gen/dankfolio/v1/wallet_pb";
import { TradeService } from "@/gen/dankfolio/v1/trade_pb";
import { CoinService } from "@/gen/dankfolio/v1/coin_pb";
import { PriceService } from "@/gen/dankfolio/v1/price_pb";
import { UtilityService } from "@/gen/dankfolio/v1/utility_pb";
import { logger as log } from '@/utils/logger';
import type { Interceptor } from "@connectrpc/connect";
import appCheck from '@react-native-firebase/app-check';
import { env } from '@utils/env';
import { Buffer } from 'buffer';

// Log the environment variable for debugging
log.log('🔧 API_URL from environment:', env.apiUrl);
const isDevelopmentOrSimulator = __DEV__ || env.appEnv === 'local' || env.appEnv === 'production-simulator' || env.e2eMockingEnabled

if (!env.apiUrl) {
	const errorMsg = 'API_URL environment variable is required but not set. Please check your environment configuration.';
	log.error('❌ Environment Error:', errorMsg);
	throw new Error(errorMsg);
}

// Authentication interceptor to add bearer tokens to all requests
const authInterceptor: Interceptor = (next) => async (req) => {
	try {
		// Instead of getting JWT token, get the Firebase App Check token directly
		if (isDevelopmentOrSimulator) {
			const appCheckToken = { token: "0FD7F5EB-8676-4D7E-A930-25A1D1B71045" }
			req.header.set('X-Firebase-AppCheck', appCheckToken.token);
			// skip validation
			return next(req);
		}
		const appCheckToken = await appCheck().getToken(false);

		log.info('🔐 Retrieved Firebase App Check token:', appCheckToken);
		log.info('🔐 Retrieved Firebase App Check token:', appCheckToken);
		log.info('🔐 Retrieved Firebase App Check token:', appCheckToken);
		log.info('🔐 Retrieved Firebase App Check token:', appCheckToken);

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
					log.info('🔐 App Check token header:', headerJson);

					// Try to get audience from payload
					const payloadBase64 = parts[1];
					const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
					const payload = JSON.parse(payloadJson);

					// Log important fields like audience and issuer
					if (payload.aud) {
						log.info('🔐 App Check token audience:', payload.aud);
					}
					if (payload.iss) {
						log.info('🔐 App Check token issuer:', payload.iss);
					}
				} catch (error: unknown) {
					if (error instanceof Error) {
						log.warn('🔐 Could not parse App Check token:', error.message);
					} else {
						log.warn("An unknown error occurred while parsing App Check token:", error);
					}
				}
			}

			log.info(`🔐 Adding Firebase App Check token to request: ${req.url}`);
			req.header.set('X-Firebase-AppCheck', appCheckToken.token);
		} else {
			log.warn(`🔐 No Firebase App Check token available for request to: ${req.url}`);
		}
	} catch (error: unknown) {
		if (error instanceof Error) {
			log.error('❌ Failed to get Firebase App Check token for request:', error.message);
		} else {
			log.error("An unknown error occurred while getting Firebase App Check token:", error);
		}
	}

	return next(req);
};

// Check if mocking is enabled to decide how to create clients
const shouldMock = process.env.E2E_MOCKING_ENABLED === 'true' || __DEV__;

let walletClient, tradeClient, coinClient, priceClient, utilityClient;

if (shouldMock) {
	log.log('🎭 Creating gRPC clients with custom fetch for mocking');

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
	log.log('🔧 Creating gRPC clients with standard transport');

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

