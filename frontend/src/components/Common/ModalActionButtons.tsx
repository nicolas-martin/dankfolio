import React from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { useStyles } from './ModalActionButtons.styles';

interface ModalActionButtonsProps {
  primaryButtonText: string;
  onPrimaryButtonPress: () => void;
  primaryButtonDisabled?: boolean;
  primaryButtonLoading?: boolean;
  primaryButtonTestID?: string;

  secondaryButtonText?: string;
  onSecondaryButtonPress?: () => void;
  secondaryButtonDisabled?: boolean;
  secondaryButtonTestID?: string;
}

const ModalActionButtons: React.FC<ModalActionButtonsProps> = ({
  primaryButtonText,
  onPrimaryButtonPress,
  primaryButtonDisabled = false,
  primaryButtonLoading = false,
  primaryButtonTestID,
  secondaryButtonText,
  onSecondaryButtonPress,
  secondaryButtonDisabled = false,
  secondaryButtonTestID,
}) => {
  const styles = useStyles();

  return (
    <View style={styles.buttonContainer}>
      {secondaryButtonText && onSecondaryButtonPress && (
        <Button
          mode="outlined" // Or "text", depending on desired default styling for secondary
          onPress={onSecondaryButtonPress}
          disabled={secondaryButtonDisabled || primaryButtonLoading} // Disable secondary if primary is loading
          style={styles.button}
          labelStyle={styles.secondaryButtonLabel}
          testID={secondaryButtonTestID}
        >
          {secondaryButtonText}
        </Button>
      )}
      <Button
        mode="contained"
        onPress={onPrimaryButtonPress}
        disabled={primaryButtonDisabled || primaryButtonLoading}
        loading={primaryButtonLoading}
        style={styles.button}
        labelStyle={styles.primaryButtonLabel}
        testID={primaryButtonTestID}
      >
        {primaryButtonText}
      </Button>
    </View>
  );
};

export default ModalActionButtons;
