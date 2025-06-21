import React from 'react';
import { View, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { useStyles } from './ScreenActionButton.styles';
import { BlurView } from '@react-native-community/blur'; // Assuming this package is available

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

    // BlurView might not work correctly in all simulators/emulators or older OS versions.
    // It's also iOS-specific by default with @react-native-community/blur.
    // For Android, a common approach is to use a semi-transparent background color
    // or a third-party library that provides cross-platform blur.

    if (Platform.OS === 'ios') {
        return (
            <View style={styles.container}>
                <BlurView
                    style={styles.blurView}
                    blurType="light" // Or "dark", "xlight", "prominent", etc.
                    blurAmount={10} // Adjust blur intensity
                    reducedTransparencyFallbackColor="white" // Fallback for reduced transparency mode
                >
                    <ButtonContent />
                </BlurView>
            </View>
        );
    }

    // Fallback for Android or if BlurView is not desired/working
    return (
        <View style={[styles.container, styles.androidFallbackContainer]}>
            <ButtonContent />
        </View>
    );
};

export default ScreenActionButton;
