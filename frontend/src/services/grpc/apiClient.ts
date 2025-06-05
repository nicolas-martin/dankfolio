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
		const appCheckToken = await appCheck().getToken(false);
		
		if (appCheckToken && appCheckToken.token) {
			// Don't log the token itself, just that we're adding it
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

