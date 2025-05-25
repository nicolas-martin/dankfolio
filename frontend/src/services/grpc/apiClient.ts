import { REACT_APP_API_URL } from '@env';

if (!REACT_APP_API_URL) {
	throw new Error('REACT_APP_API_URL environment variable is required');
}

import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { WalletService } from "@/gen/dankfolio/v1/wallet_pb";
import { TradeService } from "@/gen/dankfolio/v1/trade_pb";
import { CoinService } from "@/gen/dankfolio/v1/coin_pb";
import { PriceService } from "@/gen/dankfolio/v1/price_pb";
import { UtilityService } from "@/gen/dankfolio/v1/utility_pb";
import { AuthService } from "@/gen/dankfolio/v1/auth_pb";
import { authService } from "../authService";
import { logger as log } from '@/utils/logger';
import type { Interceptor } from "@connectrpc/connect";

// Authentication interceptor to add bearer tokens to all requests
const authInterceptor: Interceptor = (next) => async (req) => {
	try {
		const token = await authService.getAuthToken();
		if (token) {
			req.header.set('Authorization', `Bearer ${token}`);
		} else {
			log.warn('🔐 No auth token available for request');
		}
	} catch (error) {
		log.error('❌ Failed to get auth token for request:', error);
	}
	return next(req);
};

const transport = createConnectTransport({
	baseUrl: REACT_APP_API_URL,
	interceptors: [authInterceptor],
});

const walletClient = createPromiseClient(WalletService, transport);
const tradeClient = createPromiseClient(TradeService, transport);
const coinClient = createPromiseClient(CoinService, transport);
export const authClient = createPromiseClient(AuthService, transport);
const priceClient = createPromiseClient(PriceService, transport);
const utilityClient = createPromiseClient(UtilityService, transport);

export { walletClient, tradeClient, coinClient, priceClient, utilityClient, authClient };

