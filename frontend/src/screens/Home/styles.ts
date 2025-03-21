import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    headerTitle: {
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    profileButton: {
        backgroundColor: theme.colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    profileIcon: {
        width: 24,
        height: 24,
        tintColor: theme.colors.text,
    },
    searchContainer: {
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    searchInput: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        color: theme.colors.text,
        fontSize: theme.typography.fontSize.base,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
    },
    sectionHeader: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.text,
        fontWeight: 'bold',
        marginVertical: theme.spacing.lg,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    errorText: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.error,
        textAlign: 'center',
        marginTop: theme.spacing.lg,
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.xl,
    },
    retryButtonText: {
        color: theme.colors.text,
        fontSize: theme.typography.fontSize.base,
        fontWeight: 'bold',
    },
}); 