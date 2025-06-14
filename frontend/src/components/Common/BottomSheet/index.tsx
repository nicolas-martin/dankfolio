import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetModalProps, // Import this for additional props
  BottomSheetBackdropProps
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useStyles } from './ManagedBottomSheetModal.styles';
import { logger } from '@/utils/logger';

interface ManagedBottomSheetModalComponentProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: string[]; // e.g., ['50%', '90%']
  title?: string;
  // Allow passing other BottomSheetModalProps
  bottomSheetModalProps?: Omit<BottomSheetModalProps, 'snapPoints' | 'children' | 'ref' | 'onDismiss' | 'backdropComponent' | 'handleIndicatorStyle' | 'backgroundStyle'>;
}

const ManagedBottomSheetModal: React.FC<ManagedBottomSheetModalComponentProps> = ({
  isVisible,
  onClose,
  children,
  snapPoints: customSnapPoints,
  title,
  bottomSheetModalProps,
}) => {
  const styles = useStyles();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => customSnapPoints || ['50%', '75%'], [customSnapPoints]);

  useEffect(() => {
    if (isVisible) {
      logger.info('[ManagedBottomSheetModal] Presenting modal');
      bottomSheetModalRef.current?.present();
    } else {
      logger.info('[ManagedBottomSheetModal] Dismissing modal');
      bottomSheetModalRef.current?.dismiss();
    }
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.8} // Standard opacity
        onPress={onClose}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Close modal"
        accessibilityHint="Tap to close the modal"
      >
        <BlurView intensity={20} style={styles.blurViewStyle} />
      </BottomSheetBackdrop>
    ),
    [onClose, styles.blurViewStyle]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0} // Default to first snap point
      snapPoints={snapPoints}
      onDismiss={onClose} // Ensure onClose is called when dismissed by pan gesture etc.
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.bottomSheetBackground}
      enablePanDownToClose={true}
      accessible={false} // For nested accessibility on iOS
      {...bottomSheetModalProps} // Spread additional props
    >
      {title && (
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      )}
      <BottomSheetView
        style={styles.contentContainer}
        accessible={false} // Parent accessible false
        importantForAccessibility="yes" // Android specific
      >
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default ManagedBottomSheetModal;
