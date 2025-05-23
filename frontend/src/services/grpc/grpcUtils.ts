import { ConnectError } from '@connectrpc/connect';
import log from '@/utils/logger'; // Import the new logger
import { Coin as FrontendCoin } from '@/types';
import { Coin as pbCoin } from '@/gen/dankfolio/v1/coin_pb';
import { DEBUG_MODE } from '@env';

const IS_DEBUG_MODE = DEBUG_MODE === 'true';

// Helper to map gRPC model.Coin to FrontendCoin
export function mapGrpcCoinToFrontendCoin(grpcCoin: pbCoin): FrontendCoin {
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
		createdAt: grpcCoin.createdAt ? new Date(Number(grpcCoin.createdAt.seconds) * 1000) : undefined,
		lastUpdated: grpcCoin.lastUpdated ? new Date(Number(grpcCoin.lastUpdated.seconds) * 1000) : undefined,
	};
}

export const getRequestHeaders = () => {
	const headers = new Headers();
	if (IS_DEBUG_MODE) {
		headers.set("x-debug-mode", "true");
	}
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
