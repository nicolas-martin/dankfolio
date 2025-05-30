import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		paddingVertical: 16,
		// backgroundColor: theme.colors.surface, // Optional: if you want a card-like bg
		// borderRadius: theme.roundness * 2, // Optional
		// marginHorizontal: theme.spacing?.sm || 8, // Optional
		// marginBottom: theme.spacing?.md || 16, // Optional
	},
	titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 8,
    },
	title: {
		fontSize: 18,
		fontWeight: 'bold',
		color: theme.colors.onSurface,
	},
	viewAllButton: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '500',
    },
	listContentContainer: {
		paddingLeft: 16,
		paddingRight: 4,
	},
	cardWrapper: {
		marginRight: 8,
		width: 150,
		// If CoinCard doesn't have its own width, you might need to set it here
	},
	loadingContainer: {
		flexDirection: 'column', // Changed from 'row'
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		minHeight: 100,
	},
	loadingText: {
		marginTop: theme.spacing?.sm || 8, // Changed from marginLeft

		color: theme.colors.onSurfaceVariant,
	},
	emptyText: {
		textAlign: 'center',
		color: theme.colors.onSurfaceVariant,
		paddingHorizontal: 16,
        paddingVertical: 16,
		minHeight: 100,
	},
});

// Helper for theme spacing (if not directly available, you might need to define it in your theme)
// For example, in your theme.ts:
// export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
// And then access it as theme.spacing.md
// If your theme structure is different (e.g., theme.paddings.medium), adjust accordingly.
// For MD3Theme, `theme.spacing` is not standard. You might use `theme.paddings.medium` or define custom spacing.
// Let's assume `theme.spacing` might be custom added or use direct values.
