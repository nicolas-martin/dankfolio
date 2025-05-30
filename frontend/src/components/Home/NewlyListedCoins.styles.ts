import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		paddingVertical: theme.spacing?.md || 16, // Default if not in theme
		// backgroundColor: theme.colors.surface, // Optional: if you want a card-like bg
		// borderRadius: theme.roundness * 2, // Optional
		// marginHorizontal: theme.spacing?.sm || 8, // Optional
		// marginBottom: theme.spacing?.md || 16, // Optional
	},
	titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginLeft: theme.spacing?.md || 16,
        marginRight: theme.spacing?.md || 16, // Add right margin for the button
        marginBottom: theme.spacing?.sm || 8,
    },
	title: { // Remove marginLeft and marginBottom from here as it's now in titleContainer
		fontSize: 18,
		fontWeight: 'bold',
		color: theme.colors.onSurface,
	},
	viewAllButton: {
        fontSize: 14,
        color: theme.colors.primary, // Use theme's primary color
        fontWeight: '500',
    },
	listContentContainer: {
		paddingLeft: theme.spacing?.md || 16,
		paddingRight: theme.spacing?.xs || 4, // Space for the last card not to be cut off
	},
	cardWrapper: {
		marginRight: theme.spacing?.sm || 8, // Spacing between cards
		width: 150, // Example fixed width for horizontal cards, adjust as needed
		// If CoinCard doesn't have its own width, you might need to set it here
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: theme.spacing?.md || 16,
		minHeight: 100, // Give some space for loading indicator
	},
	loadingText: {
		marginLeft: theme.spacing?.sm || 8,
		color: theme.colors.onSurfaceVariant,
	},
	emptyText: {
		textAlign: 'center',
		color: theme.colors.onSurfaceVariant,
		paddingHorizontal: theme.spacing?.md || 16, // Ensure it's centered if titleContainer takes full width
        paddingVertical: theme.spacing?.md || 16,
		minHeight: 100, // Give some space
	},
});

// Helper for theme spacing (if not directly available, you might need to define it in your theme)
// For example, in your theme.ts:
// export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
// And then access it as theme.spacing.md
// If your theme structure is different (e.g., theme.paddings.medium), adjust accordingly.
// For MD3Theme, `theme.spacing` is not standard. You might use `theme.paddings.medium` or define custom spacing.
// Let's assume `theme.spacing` might be custom added or use direct values.
