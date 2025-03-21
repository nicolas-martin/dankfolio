import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    timeframeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: theme.colors.cardBackground,
        borderRadius: 8,
        marginHorizontal: 20,
        marginVertical: 10,
    },
    timeframeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    timeframeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    timeframeText: {
        color: theme.colors.text,
        fontSize: 14,
    },
    timeframeTextActive: {
        color: theme.colors.white,
    },
    chartContainer: {
        height: 300,
        marginVertical: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    priceText: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    changeText: {
        fontSize: 16,
        marginTop: 5,
    },
    positiveChange: {
        color: theme.colors.success,
    },
    negativeChange: {
        color: theme.colors.error,
    },
}); 