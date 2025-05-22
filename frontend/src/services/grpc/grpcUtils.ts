import { ConnectError } from '@connectrpc/connect';
import log from '@/utils/logger'; // Import the new logger
import { Coin as FrontendCoin } from '@/types';
import { Coin as ModelCoin } from './model';

// Helper to map gRPC model.Coin to FrontendCoin
export function mapGrpcCoinToFrontendCoin(grpcCoin: ModelCoin): FrontendCoin {
	return {
		mintAddress: grpcCoin.mintAddress,
		name: grpcCoin.name,
		symbol: grpcCoin.symbol,
		decimals: grpcCoin.decimals,
		description: grpcCoin.description,
		iconUrl: grpcCoin.iconUrl,
		tags: grpcCoin.tags, // Assuming tags is string[] in both
		price: grpcCoin.price,
		dailyVolume: grpcCoin.dailyVolume,
		website: grpcCoin.website,
		twitter: grpcCoin.twitter,
		telegram: grpcCoin.telegram,
		coingeckoId: grpcCoin.coingeckoId,
		createdAt: grpcCoin.createdAt, // Already Date | undefined in ModelCoin
		lastUpdated: grpcCoin.lastUpdated, // Already Date | undefined in ModelCoin
	};
}

export const getRequestHeaders = () => {
	const headers = new Headers();
	// x-debug-mode header can be set based on logger's level if needed,
	// but for now, let's assume the backend inspects logs based on its own config
	// or this header is set by a different mechanism if still required.
	// if (log.getLevel() <= log.levels.DEBUG) { // Example condition
	//  headers.set("x-debug-mode", "true");
	// }
	return headers;
};

// Helper function to safely serialize objects with BigInt values
const safeStringify = (obj: any, indent = 2): string => {
	return JSON.stringify(obj, (_, value) =>
		typeof value === 'bigint' ? value.toString() + 'n' : value
		, indent);
};

export const logRequest = (serviceName: string, methodName: string, params: any): void => {
	if (methodName === 'getProxiedImage') {
		// don't log proxied image request
		return
	}
	log.debug(`📤 gRPC ${serviceName}.${methodName} Request:`, safeStringify(params));
};

export const logResponse = (serviceName: string, methodName: string, response: any): void => {
	// Special handling for getPriceHistory response to prevent large logs
	if (serviceName === 'PriceService' && methodName === 'getPriceHistory' && response?.data?.items) {
		const items = response.data.items;
		const count = items.length;
		if (count === 0) {
			log.debug(`📥 gRPC ${serviceName}.${methodName} Response: { data: { items: [empty] }, ... }`);
			return;
		} else {
			const first = safeStringify(items[0], 0);
			const last = safeStringify(items[count - 1], 0);
			log.debug(`📥 gRPC ${serviceName}.${methodName} Response: { data: { items: [count=${count}, first=${first}, last=${last}] }, ... }`);
			return;
		}
	}
	log.debug(`📥 gRPC ${serviceName}.${methodName} Response:`, safeStringify(response));
};

export const logError = (serviceName: string, methodName: string, error: any): void => {
	log.error(`❌ gRPC ${serviceName}.${methodName} Error:`, safeStringify({
		message: error.message || 'Unknown error',
		code: error.code,
		// data: error.metadata ? (typeof error.metadata.toObject === 'function' ? error.metadata.toObject() : error.metadata) : undefined
	}));
};

export const handleGrpcError = (error: unknown, serviceName: string, methodName: string): never => {
	logError(serviceName, methodName, error);
	if (error instanceof ConnectError) {
		throw new Error(`${error.code}: ${error.message}`);
	}
	throw error;
}; 
