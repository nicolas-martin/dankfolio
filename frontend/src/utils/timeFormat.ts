export function formatTimeAgo(date?: Date): string {
	if (!date) {
		return ''; // Or a placeholder like '-'
	}

	const now = new Date();
	const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
	const minutes = Math.round(seconds / 60);
	const hours = Math.round(minutes / 60);
	const days = Math.round(hours / 24);

	if (seconds < 10) {
		return 'just now';
	} else if (seconds < 60) {
		return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
	} else if (minutes < 60) {
		return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	} else if (hours < 24) {
		return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	} else {
		return `${days} day${days > 1 ? 's' : ''} ago`;
	}
}
