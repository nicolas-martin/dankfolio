import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.cardBackground,
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        color: theme.colors.text,
        marginLeft: 10,
    },
    listContainer: {
        flex: 1,
    },
    coinItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    coinInfo: {
        flex: 1,
        marginLeft: 15,
    },
    coinName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    coinSymbol: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    priceInfo: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    priceChange: {
        fontSize: 14,
        marginTop: 4,
    },
    positiveChange: {
        color: theme.colors.success,
    },
    negativeChange: {
        color: theme.colors.error,
    },
}); 