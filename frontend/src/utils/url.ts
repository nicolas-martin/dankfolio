import { Linking } from 'react-native';
import { logger } from '@/utils/logger';

export const getSolscanUrl = (txHash: string): string => {
	return `https://solscan.io/tx/${txHash}`;
};

export const openSolscanUrl = async (txHash: string): Promise<void> => {
	const url = getSolscanUrl(txHash);
	try {
		const supported = await Linking.canOpenURL(url);
		if (supported) {
			await Linking.openURL(url);
		} else {
			logger.error('Cannot open URL', { url });
		}
	} catch (error) {
		logger.exception(error, { functionName: 'openSolscanUrl', params: { url } });
	}
}; 
