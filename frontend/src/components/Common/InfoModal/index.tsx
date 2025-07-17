import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useStyles } from './styles';
import { CloseIcon } from '../Icons';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose, title, message }) => {
  const styles = useStyles();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} testID="close-button">
              <CloseIcon size={24} color={styles.closeIcon.color} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

export default InfoModal;
