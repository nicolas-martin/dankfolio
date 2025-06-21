import React from 'react';
import { View, Platform } from 'react-native'; // Platform might still be useful for fine-tuning intensity
import { Button } from 'react-native-paper';
import { useStyles } from './ScreenActionButton.styles';
import { BlurView } from 'expo-blur'; // Using expo-blur

interface ScreenActionButtonProps {
    text: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    testID?: string;
}

const ScreenActionButton: React.FC<ScreenActionButtonProps> = ({
    text,
    onPress,
    disabled = false,
    loading = false,
    testID,
}) => {
    const styles = useStyles();

    const ButtonContent = () => (
        <Button
            mode="contained"
            onPress={onPress}
            disabled={disabled || loading}
            loading={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            testID={testID}
            contentStyle={styles.buttonContent} // Ensure content style is applied for height
        >
            {text}
        </Button>
    );

    // expo-blur works on both iOS and Android.
    // We can use a single implementation.
    // `tint` prop can be 'light', 'dark', or 'default'.
    // `intensity` is a value between 0 and 100.
    return (
        <View style={styles.container}>
            <BlurView
                style={styles.blurView} // Ensure this style allows BlurView to fill the container
                tint="light"
                intensity={85} // Default intensity, can be adjusted
            >
                <ButtonContent />
            </BlurView>
        </View>
    );
};

export default ScreenActionButton;
