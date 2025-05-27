export interface RefreshTimerProps {
	/** Duration of the refresh cycle in milliseconds */
	duration: number;
	/** Whether the timer is currently active */
	isActive: boolean;
	/** Callback when the timer completes a cycle */
	onComplete?: () => void;
	/** Whether to show the timer (for conditional rendering) */
	visible?: boolean;
}

export interface RefreshTimerState {
	/** Current progress from 0 to 1 */
	progress: number;
	/** Remaining time in seconds */
	remainingSeconds: number;
} 