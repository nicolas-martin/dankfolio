import { StyleSheet, Dimensions } from 'react-native';
import { MD3Theme } from 'react-native-paper';

// Calculate default cardWidth here if not passed, or expect it to be passed
// For placeholder, it might be better to pass it if it's dynamically calculated in the component
// const defaultCardWidth = Dimensions.get('window').width * 0.45;

export const createStyles = (theme: MD3Theme, isHorizontal?: boolean, cardWidth?: number) => {
	const actualCardWidth = cardWidth || Dimensions.get('window').width * 0.45; // Fallback if not provided

	return StyleSheet.create({
    // Original styles
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        elevation: 2,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    content: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
    },
    leftSection: {
        alignItems: 'center',
        flexDirection: 'row',
        flex: 0.35,
        minWidth: 0,
        paddingRight: 8,
    },
    logo: { // For vertical card
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    nameSection: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    symbol: {
        color: theme.colors.onSurface,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
        marginBottom: 1,
    },
    balance: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.1,
    },
    name: {
        color: theme.colors.onSurfaceVariant,
        flexShrink: 1,
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.1,
    },
    rightSection: {
        alignItems: 'flex-end',
        flex: 0.25,
        justifyContent: 'center',
        minWidth: 0,
    },
    price: {
        color: theme.colors.onSurface,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
        marginBottom: 1,
        textAlign: 'right',
    },
    volume: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.1,
        textAlign: 'right',
    },
    changePositive: {
        color: '#2E7D32', // Consider using theme colors
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'right',
    },
    changeNegative: {
        color: '#D32F2F', // Consider using theme colors
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'right',
    },
    changeNeutral: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 12,
        fontWeight: '400',
        textAlign: 'right',
    },

    // Styles for isHorizontal = true
    horizontalCard: {
        backgroundColor: theme.colors.surface, // Or surfaceVariant for differentiation
        borderRadius: 12, // Slightly smaller rounding
        padding: 10,
        alignItems: 'center', // Center content vertically in the card
        justifyContent: 'center', // Center content horizontally
        width: '100%', // Take full width of cardWrapper (e.g., 150px)
        height: 120, // Example height, adjust as needed
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    horizontalLogoContainer: {
        marginBottom: 8,
    },
    horizontalSymbol: {
        color: theme.colors.onSurface,
        fontSize: 14, // Smaller font
        fontWeight: '600',
        textAlign: 'center',
    },
    horizontalPrice: {
        color: theme.colors.onSurface,
        fontSize: 13, // Smaller font
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
    },
    horizontalChange: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
    changePositiveSmall: { color: '#2E7D32' },
    changeNegativeSmall: { color: '#D32F2F' },
    changeNeutralSmall: { color: theme.colors.onSurfaceVariant },

    // Styles for Sparkline (positioned in the middle)
    sparklineContainer: {
        alignItems: 'center',
        flex: 0.4,
        height: 36,
        justifyContent: 'center',
    },
    sparklinePlaceholder: {
        backgroundColor: theme.colors.surfaceDisabled,
        borderRadius: 4,
        height: 20,
        width: actualCardWidth * 0.35,
    },
	});
};
