import { useState, useCallback } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { logger } from '@/utils/logger';
import { CopyState } from './types';

export const COPY_FEEDBACK_DURATION = 1500; // Duration to show checkmark in milliseconds

export const useCopyToClipboard = () => {
	const [copyState, setCopyState] = useState<CopyState>({
		isCopied: false,
		isAnimating: false,
	});

	const copyToClipboard = useCallback(async (text: string, onCopy?: () => void) => {
		try {
			// Set animating state immediately
			setCopyState({ isCopied: false, isAnimating: true });
			
			// Copy to clipboard
			await Clipboard.setString(text);
			
			// Show success state
			setCopyState({ isCopied: true, isAnimating: true });
			
			// Log the copy action
			logger.breadcrumb({
				category: 'ui',
				message: 'Text copied to clipboard',
				data: { textLength: text.length }
			});
			
			// Call optional callback
			onCopy?.();
			
			// Reset state after duration
			setTimeout(() => {
				setCopyState({ isCopied: false, isAnimating: false });
			}, COPY_FEEDBACK_DURATION);
			
		} catch (error) {
			logger.error('Failed to copy to clipboard:', error);
			// Reset state on error
			setCopyState({ isCopied: false, isAnimating: false });
		}
	}, []);

	return {
		copyState,
		copyToClipboard,
	};
}; 