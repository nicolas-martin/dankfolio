import { ConnectError } from '@connectrpc/connect';
import { logger as log } from '@/utils/logger'; // Import the new logger
import { Coin as FrontendCoin } from '@/types';
import { Coin as pbCoin } from '@/gen/dankfolio/v1/coin_pb';
import { DEBUG_MODE } from '@env';
import { Timestamp, timestampFromDate } from '@bufbuild/protobuf/wkt';


const IS_DEBUG_MODE = DEBUG_MODE === 'true';


// Helper to map gRPC model.Coin to FrontendCoin
export function mapGrpcCoinToFrontendCoin(grpcCoin: pbCoin): FrontendCoin {
	return {
		mintAddress: grpcCoin.mintAddress,
		name: grpcCoin.name,
		symbol: grpcCoin.symbol,
		decimals: grpcCoin.decimals,
		description: grpcCoin.description,
		resolvedIconUrl: grpcCoin.resolvedIconUrl || grpcCoin.iconUrl, // Prefer resolvedIconUrl, fallback to iconUrl
		tags: grpcCoin.tags, // Assuming tags is string[] in both
		price: grpcCoin.price,
		dailyVolume: grpcCoin.dailyVolume,
		website: grpcCoin.website,
		twitter: grpcCoin.twitter,
		telegram: grpcCoin.telegram,
		coingeckoId: grpcCoin.coingeckoId,
		createdAt: timestampToDate(grpcCoin.createdAt),
		lastUpdated: timestampToDate(grpcCoin.lastUpdated),
		jupiterListedAt: timestampToDate(grpcCoin.jupiterListedAt),
	};
}

export const getRequestHeaders = () => {
	const headers = new Headers();
	if (IS_DEBUG_MODE) {
		headers.set("x-debug-mode", "true");
	}
	// Note: Authentication headers are now automatically added via Connect interceptors
	// See apiClient.ts for the authInterceptor implementation
	return headers;
};

// Helper function to safely serialize objects with BigInt values
const safeStringify = (obj: any, indent = 2): string => {
	try {
		return JSON.stringify(obj, (key, value) => {
			// Handle BigInt values
			if (typeof value === 'bigint') {
				return value.toString() + 'n';
			}
			
			// Handle objects that might contain BigInt values
			if (value && typeof value === 'object' && value.seconds && typeof value.seconds === 'bigint') {
				return {
					...value,
					seconds: value.seconds.toString() + 'n'
				};
			}
			
			return value;
		}, indent);
	} catch (error) {
		log.error('❌ Error in safeStringify:', error);
		return `[Error serializing object: ${(error as Error).message}]`;
	}
};

export const logRequest = (serviceName: string, methodName: string, params: any): void => {
	if (methodName === 'getProxiedImage') {
		// don't log proxied image request
		return
	}
	log.info(`📤 gRPC Request: ${serviceName}.${methodName}`);
	log.log(`📤 gRPC ${serviceName}.${methodName} Request Details:`, safeStringify(params));
};

export const logResponse = (serviceName: string, methodName: string, response: any): void => {
	log.info(`📥 gRPC Response: ${serviceName}.${methodName}`);
	// Special handling for getProxiedImage response to prevent logging base64 data
	if (serviceName === 'UtilityService' && methodName === 'getProxiedImage') {
		log.log(`📥 gRPC ${serviceName}.${methodName} Response: { imageData: [REDACTED] }`);
		return;
	}
	// Special handling for getPriceHistory response to prevent large logs
	if (serviceName === 'PriceService' && methodName === 'getPriceHistory' && response?.data?.items) {
		const items = response.data.items;
		const count = items.length;
		if (count === 0) {
			log.log(`📥 gRPC ${serviceName}.${methodName} Response: { data: { items: [empty] }, ... }`);
			return;
		} else {
			const first = safeStringify(items[0], 0);
			const last = safeStringify(items[count - 1], 0);
			log.log(`📥 gRPC ${serviceName}.${methodName} Response Details: { data: { items: [count=${count}, first=${first}, last=${last}] }, ... }`);
			return;
		}
	}
	log.log(`📥 gRPC ${serviceName}.${methodName} Response Details:`, safeStringify(response));
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
		// Add specific handling for authentication errors (code 16 is UNAUTHENTICATED in gRPC)
		if (error.code === 16) {
			log.error(`❌ gRPC ${serviceName}.${methodName} Authentication Error:`, {
				message: error.message,
				code: error.code,
				details: 'This is an authentication error. Check if your Firebase App Check token is valid.'
			});

			// No special handling needed for App Check tokens as they're obtained on each request
		}
		throw new Error(`${error.code}: ${error.message}`);
	}
	throw error;
};
// Helper to convert timestamp strings to Timestamp objects
export const convertToTimestamp = (dateStr: string): Timestamp => {
	return timestampFromDate(new Date(dateStr));
}

export function timestampToDate(timestamp: Timestamp | undefined): Date | undefined {
	if (!timestamp) return undefined;

	try {
		// Handle BigInt if present
		let seconds: number;
		
		if (typeof timestamp.seconds === 'bigint') {
			// Convert BigInt to string first, then to Number to avoid precision issues
			seconds = Number(timestamp.seconds.toString());
		} else if (timestamp.seconds === undefined || timestamp.seconds === null) {
			log.warn('⚠️ Timestamp seconds is undefined or null');
			return undefined;
		} else {
			seconds = Number(timestamp.seconds);
		}

		const nanos = timestamp.nanos || 0;
		const milliseconds = seconds * 1000 + nanos / 1000000;

		return new Date(milliseconds);
	} catch (error) {
		log.error('❌ Error converting timestamp:', error);
		log.error('❌ Problematic timestamp value:', {
			secondsType: timestamp.seconds ? typeof timestamp.seconds : 'undefined',
			secondsValue: timestamp.seconds ? 
				(typeof timestamp.seconds === 'bigint' ? timestamp.seconds.toString() : timestamp.seconds) : 'undefined',
			nanosValue: timestamp.nanos
		});
		return undefined;
	}
}
