import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        backgroundColor: theme.colors.cardBackground,
        padding: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 5,
    },
    email: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 15,
    },
    walletContainer: {
        backgroundColor: theme.colors.cardBackground,
        padding: 20,
        marginVertical: 10,
    },
    walletTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 10,
    },
    walletAddress: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 10,
    },
    balance: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    transactionsContainer: {
        flex: 1,
        padding: 20,
    },
    transactionsTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 15,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionType: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    transactionDate: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 5,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
    buyAmount: {
        color: theme.colors.success,
    },
    sellAmount: {
        color: theme.colors.error,
    },
}); 