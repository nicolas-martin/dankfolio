export const formatRelativeDate = (dateString: string): string => {
	const date = new Date(dateString);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
	} else if (diffDays === 1) {
		return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
	} else if (diffDays < 7) {
		return `${diffDays} days ago`;
	} else {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
};