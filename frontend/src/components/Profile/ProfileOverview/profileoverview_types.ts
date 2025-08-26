export interface ProfileOverviewProps {
	totalValue: number;
	tokensCount: number;
	onSendPress: () => void;
	disabled?: boolean;
}