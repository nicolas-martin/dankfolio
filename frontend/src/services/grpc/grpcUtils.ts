import { ConnectError } from '@connectrpc/connect';
import { DEBUG_MODE } from '@env';

const IS_DEBUG_MODE = DEBUG_MODE === 'true';

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
	console.log(`📤 gRPC ${serviceName}.${methodName} Request:`, safeStringify(params));
};

export const logResponse = (serviceName: string, methodName: string, response: any): void => {
	// Special handling for getPriceHistory response to prevent large logs
	if (serviceName === 'PriceService' && methodName === 'getPriceHistory' && response?.data?.items) {
		const items = response.data.items;
		const count = items.length;
		if (count === 0) {
			console.log(`📥 gRPC ${serviceName}.${methodName} Response: { data: { items: [empty] }, ... }`);
			return;
		} else {
			const first = safeStringify(items[0], 0);
			const last = safeStringify(items[count - 1], 0);
			console.log(`📥 gRPC ${serviceName}.${methodName} Response: { data: { items: [count=${count}, first=${first}, last=${last}] }, ... }`);
			return;
		}
	}
	console.log(`📥 gRPC ${serviceName}.${methodName} Response:`, safeStringify(response));
};

export const logError = (serviceName: string, methodName: string, error: any): void => {
	console.error(`❌ gRPC ${serviceName}.${methodName} Error:`, safeStringify({
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
