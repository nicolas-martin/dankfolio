export type TxAction = 'received' | 'sent' | 'swap';

export interface ActivityItem {
	id: string;
	timestamp: number;
	action: TxAction;
	mintIn?: string;
	mintOut?: string;
	amountIn?: number;
	amountOut?: number;
	counterparty?: string;
	status: 'pending' | 'completed' | 'failed';
	fiat?: {
		primary?: number;
		currency?: 'USD' | 'CAD'
	};
	transactionHash?: string;
}

export interface ActivityIconProps {
	baseTokenIcon?: string;
	actionBadgeIcon?: string;
	actionBadgeType: 'arrow-down' | 'paper-plane' | 'token-icon';
	size?: number;
}

export interface ActivityRowProps {
	item: ActivityItem;
	onPress?: (item: ActivityItem) => void;
	onLongPress?: (item: ActivityItem) => void;
}
