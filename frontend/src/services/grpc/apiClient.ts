import { REACT_APP_API_URL } from '@env';
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

// Log the environment variable for debugging
log.log('🔧 REACT_APP_API_URL from environment:', REACT_APP_API_URL);

if (!REACT_APP_API_URL) {
	const errorMsg = 'REACT_APP_API_URL environment variable is required but not set. Please check your .env configuration.';
	log.error('❌ Environment Error:', errorMsg);
	throw new Error(errorMsg);
}

// Authentication interceptor to add bearer tokens to all requests
const authInterceptor: Interceptor = (next) => async (req) => {
	try {
		// Instead of getting JWT token, get the Firebase App Check token directly
		if (__DEV__) {
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
				} catch (parseError) {
					log.warn('🔐 Could not parse App Check token:', parseError);
				}
			}

			log.info(`🔐 Adding Firebase App Check token to request: ${req.url}`);
			req.header.set('X-Firebase-AppCheck', appCheckToken.token);
		} else {
			log.warn(`🔐 No Firebase App Check token available for request to: ${req.url}`);
		}
	} catch (error) {
		log.error('❌ Failed to get Firebase App Check token for request:', error);
	}
	return next(req);
};

// Main transport with auth interceptor for authenticated requests
const transport = createConnectTransport({
	baseUrl: REACT_APP_API_URL,
	interceptors: [authInterceptor],
});

const walletClient = createClient(WalletService, transport);
const tradeClient = createClient(TradeService, transport);
const coinClient = createClient(CoinService, transport);
const priceClient = createClient(PriceService, transport);
const utilityClient = createClient(UtilityService, transport);

export { walletClient, tradeClient, coinClient, priceClient, utilityClient };

