import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
    cardWrapper: {
        marginRight: 8,
        width: 140, // Adjusted width
    },
    container: {
        paddingBottom: 24,
        paddingTop: 16,
    },
    emptyText: {
        color: theme.colors.onSurfaceVariant,
        minHeight: 100,
        paddingHorizontal: 16,
        paddingVertical: 16,
        textAlign: 'center',
    },
    listContentContainer: {
        paddingLeft: 16,
        paddingRight: 4,
    },
    loadingContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: 100,
        padding: 16,
    },
    loadingText: {
        color: theme.colors.onSurfaceVariant,
        marginLeft: 8,
    },
    title: {
        color: theme.colors.onSurface,
        fontSize: 20,
        fontWeight: '600',
    },
    titleContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        marginLeft: 16,
        marginRight: 16,
    },
    viewAllButton: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
});

// Helper for theme spacing (if not directly available, you might need to define it in your theme)
// For example, in your theme.ts:
// export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
// And then access it as theme.spacing.md
// If your theme structure is different (e.g., theme.paddings.medium), adjust accordingly.
// For MD3Theme, `theme.spacing` is not standard. You might use `theme.paddings.medium` or define custom spacing.
// Let's assume `theme.spacing` might be custom added or use direct values.
