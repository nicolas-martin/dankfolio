import { useState, useCallback, useRef, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';
import { logger } from '@/utils/logger';
import { CopyState } from './types';

export const COPY_FEEDBACK_DURATION = 1500;

export const useCopyToClipboard = () => {
	const [copyState, setCopyState] = useState<CopyState>({
		isCopied: false,
		isAnimating: false,
	});
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const copyToClipboard = useCallback(async (text: string, onCopy?: () => void) => {
		try {
			// Set animating state immediately
			setCopyState({ isCopied: false, isAnimating: true });

			// Copy to clipboard
			Clipboard.setStringAsync(text);

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

			// Clear any existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Reset state after duration
			timeoutRef.current = setTimeout(() => {
				setCopyState({ isCopied: false, isAnimating: false });
				timeoutRef.current = null;
			}, COPY_FEEDBACK_DURATION);

		} catch (error) {
			logger.error('Failed to copy to clipboard:', error);
			
			// Clear any existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			
			// Reset state on error
			setCopyState({ isCopied: false, isAnimating: false });
		}
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return {
		copyState,
		copyToClipboard,
	};
}; 
