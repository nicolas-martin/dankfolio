import { StyleSheet, Dimensions } from 'react-native';
import { MD3Theme } from 'react-native-paper';

// Calculate default cardWidth here if not passed, or expect it to be passed
// For placeholder, it might be better to pass it if it's dynamically calculated in the component
// const defaultCardWidth = Dimensions.get('window').width * 0.45;

export const createStyles = (theme: MD3Theme, isHorizontal?: boolean, cardWidth?: number) => {
	const _actualCardWidth = cardWidth || Dimensions.get('window').width * 0.45; // Fallback if not provided, prefixed

	return StyleSheet.create({
    balance: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.1,
    },
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
    changeNegative: {
        color: '#D32F2F', // Consider using theme colors
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'right',
    },
    changeNegativeSmall: { color: '#D32F2F' },
    changeNeutral: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 12,
        fontWeight: '400',
        textAlign: 'right',
    },
    changeNeutralSmall: { color: theme.colors.onSurfaceVariant },
    changePositive: {
        color: '#2E7D32', // Consider using theme colors
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'right',
    },
    changePositiveSmall: { color: '#2E7D32' },
    content: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
    },
    horizontalCard: {
        alignItems: 'center', // Center content vertically in the card
        backgroundColor: theme.colors.surface, // Or surfaceVariant for differentiation
        borderRadius: 12, // Slightly smaller rounding
        elevation: 1,
        height: 120, // Example height, adjust as needed
        justifyContent: 'center', // Center content horizontally
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        width: '100%', // Take full width of cardWrapper (e.g., 150px)
    },
    horizontalChange: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
    horizontalLogoContainer: {
        marginBottom: 8,
    },
    horizontalPrice: {
        color: theme.colors.onSurface,
        fontSize: 13, // Smaller font
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'center',
    },
    horizontalSymbol: {
        color: theme.colors.onSurface,
        fontSize: 14, // Smaller font
        fontWeight: '600',
        textAlign: 'center',
    },
    leftSection: {
        alignItems: 'center',
        flex: 0.35,
        flexDirection: 'row',
        minWidth: 0,
        paddingRight: 8,
    },
    logo: { // For vertical card - properties sorted
        borderRadius: 18,
        height: 36,
        marginRight: 10,
        width: 36,
    },
    name: {
        color: theme.colors.onSurfaceVariant,
        flexShrink: 1,
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.1,
    },
    nameSection: {
        flex: 1,
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
    rightSection: {
        alignItems: 'flex-end',
        flex: 0.25,
        justifyContent: 'center',
        minWidth: 0,
    },
    sparklineContainer: {
        alignItems: 'center',
        flex: 0.4,
        height: 36,
        justifyContent: 'center',
    },
    symbol: {
        color: theme.colors.onSurface,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
        marginBottom: 1,
    },
    volume: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.1,
        textAlign: 'right',
    },
	});
};
