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
                // Style for the BlurView itself
                // The button will be a child of this, so padding should be on the button or an inner view
            },
            androidFallbackContainer: {
                // Specific to Android fallback
                backgroundColor: 'rgba(230, 230, 230, 0.9)', // Light semi-transparent background for a blur-like effect
                // Add elevation for a slight shadow if desired, consistent with Material Design
                ...(Platform.OS === 'android' && {
                    elevation: 3,
                }),
            },
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
