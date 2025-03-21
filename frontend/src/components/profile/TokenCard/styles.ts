import { StyleSheet } from 'react-native';
import { theme } from '../../../utils/theme';

export const styles = StyleSheet.create({
    tokenCard: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
    },
    tokenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    tokenHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    tokenLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    tokenInfo: {
        flex: 1,
        gap: 4,
    },
    tokenSymbol: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: 0.7,
    },
    addressText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
    },
    copyIcon: {
        fontSize: 12,
    },
    tokenDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    tokenDetail: {
        flex: 1,
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 5,
    },
    detailValue: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
