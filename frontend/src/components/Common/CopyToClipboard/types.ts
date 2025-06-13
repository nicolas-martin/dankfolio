import React from 'react';

export interface CopyToClipboardProps {
	text: string;
	children: React.ReactNode;
	onCopy?: () => void;
	disabled?: boolean;
	testID?: string;
}

export interface CopyState {
	isCopied: boolean;
	isAnimating: boolean;
} 