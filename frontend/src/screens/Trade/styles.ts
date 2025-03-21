import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    tradeContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    headerText: {
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.text,
        fontWeight: 'bold',
        marginLeft: theme.spacing.lg,
    },
    inputContainer: {
        marginBottom: theme.spacing.xl,
    },
    label: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    input: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        color: theme.colors.text,
        fontSize: theme.typography.fontSize.lg,
    },
    valueContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: theme.spacing.sm,
    },
    valueText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.textSecondary,
    },
    priceText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.textSecondary,
    },
    buttonContainer: {
        marginTop: 'auto',
        paddingVertical: theme.spacing.lg,
    },
    tradeButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    tradeButtonText: {
        color: theme.colors.text,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
}); 