import { ReactNode } from 'react';

export interface RightAction {
	icon: ReactNode;
	onPress: () => void;
	testID?: string;
}

export interface ScreenHeaderProps {
	title: string;
	subtitle?: string;
	rightAction?: RightAction;
	showRightAction?: boolean;
}