import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 8, // Adjusted padding
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%', // Will take width from parent wrapper in FlatList
        height: 100, // Target height
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    logoContainer: {
        marginBottom: 6, // Adjusted margin
    },
    symbol: {
        color: theme.colors.onSurface,
        fontSize: 13, // Adjusted font size
        fontWeight: '600',
        textAlign: 'center',
    },
    price: {
        color: theme.colors.onSurface,
        fontSize: 12, // Adjusted font size
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
    },
    change: {
        fontSize: 10, // Adjusted font size
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 4,
    },
    changePositive: { color: '#2E7D32' }, // Consider theme colors
    changeNegative: { color: '#D32F2F' }, // Consider theme colors
    changeNeutral: { color: theme.colors.onSurfaceVariant }
});
