import { StyleSheet, Platform } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Assuming AppTheme is your extended theme type
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
    const theme = useTheme() as AppTheme;

    return useMemo(() => {
        return StyleSheet.create({
            container: {
                // Common container properties
                marginHorizontal: theme.spacing.md,
                marginVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.xl, // Standardized border radius from theme
                overflow: 'hidden', // Important for BlurView and borderRadius to work together
            },
            blurView: {
                // This view will wrap the button content.
                // It should allow the button's padding to define its size.
                // No specific width/height needed here as it expands with content.
            },
            // androidFallbackContainer is no longer needed as expo-blur is cross-platform.
            button: {
                // Style for the react-native-paper Button
                borderRadius: theme.borderRadius.xl, // Ensure button itself also has the radius
                // The height will be primarily controlled by padding and labelStyle
                paddingVertical: theme.spacing.sm, // Standardized vertical padding
            },
            buttonContent: {
                // Style for the Button's content wrapper (used to control height effectively)
                paddingVertical: theme.spacing.xs, // Adjust as needed for desired button height
                // minHeight: 50, // Example of setting a minimum height
            },
            buttonLabel: {
                // Style for the Button's label text
                fontSize: theme.typography.fontSize.lg, // Standardized font size
                fontWeight: 'bold', // Standardized font weight
                // color: theme.colors.onPrimary, // Usually handled by Button's mode="contained"
                textAlign: 'center',
            },
        });
    }, [theme]);
};
