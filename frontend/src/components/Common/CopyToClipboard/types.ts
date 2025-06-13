import React from 'react';

export interface CopyToClipboardProps {
	text: string;
	onCopy?: () => void;
	disabled?: boolean;
	testID?: string;
	iconSize?: number;
	iconColor?: string;
}

export interface CopyState {
	isCopied: boolean;
	isAnimating: boolean;
} 
