import { StyleSheet } from 'react-native';
import { theme } from 'utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191B1F',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    tradeContainer: {
        backgroundColor: theme.colors.cardBackGround,
        borderRadius: 20,
        padding: 20,
        margin: 20,
    },
    valueInfo: {
        marginTop: -8,
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    valueText: {
        fontSize: 14,
        color: '#9F9FD5',
        textAlign: 'right',
    },
    priceText: {
        fontSize: 12,
        color: '#9F9FD5',
        textAlign: 'right',
        marginTop: 2,
    },
}); 